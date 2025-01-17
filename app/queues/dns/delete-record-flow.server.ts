import { FlowProducer } from 'bullmq';
import { redis } from '~/lib/redis.server';
import { buildDomain } from '~/utils';
import { dnsUpdateQueueName } from './workers/dns-update-worker.server';
import { pollDnsStatusQueueName } from './workers/poll-dns-status-worker.server';
import { syncDbStatusQueueName } from './workers/sync-db-status-worker.server';
import { WorkType } from './add-record-flow.server';

import type { FlowJob } from 'bullmq';
import type { Record } from '@prisma/client';
import type { DnsUpdaterData } from './workers/dns-update-worker.server';
import type { DbRecordSynchronizerData } from './workers/sync-db-status-worker.server';
import type { Subdomain } from './add-record-flow.server';

export type DeleteDnsRequestData = Pick<Record, 'id' | 'username' | 'type' | 'value'> & Subdomain;

const flowProducer = new FlowProducer({ connection: redis });

export const deleteDnsRequest = async (data: DeleteDnsRequestData) => {
  const { id, username, type, subdomain, value } = data;

  const fqdn = buildDomain(username, subdomain);

  // Step 1. Request Route53 to delete the record
  const updateDnsRecord: FlowJob = {
    name: `deleteDnsRecord:${subdomain}-${username}`,
    queueName: dnsUpdateQueueName,
    data: {
      workType: WorkType.delete,
      username,
      type,
      fqdn,
      value,
    } as DnsUpdaterData,
    opts: {
      failParentOnFailure: true,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 15_000,
      },
    },
  };

  // Step 2. Poll Route53 to check connection status of the domain until it's ready
  const pollDnsStatus: FlowJob = {
    name: `pollDnsStatus:${subdomain}-${username}`,
    queueName: pollDnsStatusQueueName,
    children: [updateDnsRecord],
    opts: {
      failParentOnFailure: true,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 60_000,
      },
    },
  };

  // Step 3. Delete the record in MySQL
  const updateDbRecord: FlowJob = {
    name: `deleteDbRecord:${subdomain}-${username}`,
    queueName: syncDbStatusQueueName,
    data: { workType: WorkType.delete, id } as DbRecordSynchronizerData,
    children: [pollDnsStatus],
    opts: {
      failParentOnFailure: true,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 15_000,
      },
    },
  };

  return flowProducer.add(updateDbRecord);
};
