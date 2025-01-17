import { FlowProducer } from 'bullmq';
import { redis } from '~/lib/redis.server';
import { buildDomain } from '~/utils';
import { dnsUpdateQueueName } from './workers/dns-update-worker.server';
import { pollDnsStatusQueueName } from './workers/poll-dns-status-worker.server';
import { syncDbStatusQueueName } from './workers/sync-db-status-worker.server';
import { WorkType } from './add-record-flow.server';
import { updateRecordById } from '~/models/record.server';

import type { Record } from '@prisma/client';
import type { FlowJob } from 'bullmq';
import type { DnsUpdaterData } from './workers/dns-update-worker.server';
import type { DbRecordSynchronizerData } from './workers/sync-db-status-worker.server';
import type { Subdomain } from './add-record-flow.server';

export type UpdateDnsRequestData = Pick<Record, 'id' | 'username' | 'type' | 'value'> &
  Partial<Pick<Record, 'description' | 'course' | 'ports'>> &
  Subdomain;

const flowProducer = new FlowProducer({ connection: redis });

export const updateDnsRequest = async (data: UpdateDnsRequestData) => {
  const { username, type, subdomain, value, id } = data;

  const fqdn = buildDomain(username, subdomain);

  // Before running workflow, update the record in DB
  await updateRecordById({
    id: data.id,
    type: data.type,
    name: subdomain,
    value: data.value,
    description: data.description,
    course: data.course,
    ports: data.ports,
  });

  // Step 1. Request Route53 to update the record
  const updateDnsRecord: FlowJob = {
    name: `updateDnsRecord:${subdomain}-${username}`,
    queueName: dnsUpdateQueueName,
    data: {
      workType: WorkType.update,
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

  // Step 3. Update the MySQL record with the active or error status
  const syncDbStatus: FlowJob = {
    name: `syncDbStatus:${subdomain}-${username}`,
    queueName: syncDbStatusQueueName,
    children: [pollDnsStatus],
    data: { workType: WorkType.update, id } as DbRecordSynchronizerData,
    opts: {
      failParentOnFailure: true,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 30_000,
      },
    },
  };

  return flowProducer.add(syncDbStatus);
};
