import { AddIcon, InfoIcon } from '@chakra-ui/icons';
import {
  Button,
  Input,
  InputGroup,
  InputRightAddon,
  Select,
  Textarea,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { Form } from '@remix-run/react';

import { useUser } from '~/utils';
import FormField from './form-field';

interface DnsRecordFormProps {
  typeError?: string; // Error for 'Type' field
}

export default function DnsRecordForm({ typeError }: DnsRecordFormProps) {
  const user = useUser();

  return (
    <Form className="domain-form" method="post">
      <VStack maxW="xl" spacing="2">
        <FormField label="Record Name" isRequired={true}>
          <InputGroup>
            <Input name="name" />
            <InputRightAddon children={`.${user.baseDomain}`} />
          </InputGroup>
          <Tooltip label="Enter a name for the DNS Record: name">
            <InfoIcon color="#d9d9d9" fontSize="xl" />
          </Tooltip>
        </FormField>

        <FormField label="Type" isRequired={true} error={typeError}>
          <Select placeholder="Select a type" name="type">
            <option value="A">A</option>
            <option value="AAAA">AAAA</option>
            <option value="CNAME">CNAME</option>
            <option value="TXT">TXT</option>
          </Select>
          <Tooltip label="Select the DNS Record type">
            <InfoIcon />
          </Tooltip>
        </FormField>

        <FormField label="Value" isRequired={true}>
          <Input name="value" />
          <Tooltip label="Enter DNS Record value">
            <InfoIcon />
          </Tooltip>
        </FormField>

        <FormField label="Ports">
          <Input name="ports" />
          <Tooltip label="Enter port(s) separated by commas (E.g. 8080, 1234)">
            <InfoIcon />
          </Tooltip>
        </FormField>

        <FormField label="Course">
          <Input name="course" />
          <Tooltip label="Enter course name (E.g. OSD700)">
            <InfoIcon />
          </Tooltip>
        </FormField>

        <FormField label="Description">
          <Textarea rows={10} name="description" />
        </FormField>
      </VStack>
      <Button type="submit" mt="6" rightIcon={<AddIcon boxSize={3.5} mt="0.15rem" />}>
        Create
      </Button>
    </Form>
  );
}
