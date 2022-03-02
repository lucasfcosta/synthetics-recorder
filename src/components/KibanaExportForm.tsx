/*
MIT License

Copyright (c) 2021-present, Elastic NV

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiSpacer,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
} from "@elastic/eui";
import { KibanaClient } from "../helpers/kibana_client";
import { CommunicationContext } from "../contexts/CommunicationContext";

type TimeUnits = "s" | "m" | "h";

interface ScheduleFieldProps {
  onChange: (schedule: string) => void;
  onBlur: (schedule: string) => void;
}

export const ScheduleField = ({ onChange, onBlur }: ScheduleFieldProps) => {
  const [unit, setUnit] = useState<TimeUnits>("m");
  const [n, setN] = useState<number>(3);

  const options = [
    { text: "Seconds", value: "s" },
    { text: "Minutes", value: "m" },
    { text: "Hours", value: "h" },
  ];

  const toScheduleString = (n: number, unit: TimeUnits) => `@every ${n}${unit}`;

  const onNumberUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const updatedNumber =
      event.target.value === null ? 0 : parseInt(event.target.value);
    setN(updatedNumber);
    onChange(toScheduleString(updatedNumber, unit));
  };

  const onUnitUpdate = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedUnit = event.target.value as TimeUnits;
    setUnit(updatedUnit);
    onChange(toScheduleString(n, updatedUnit));
  };

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFieldNumber
          step={1}
          min={1}
          value={n}
          onChange={onNumberUpdate}
          onBlur={onNumberUpdate}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSelect
          options={options}
          value={unit}
          onChange={onUnitUpdate}
          onBlur={onUnitUpdate}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

type KibanaExportFormProps = {
  scriptContent: string;
  // TODO dedupe this type
  onFormChange: (values: {
    name: string;
    description: string;
    schedule: string;
    policy: string;
  }) => void;
};

// TODO better handling of default values here
export const KibanaExportForm: React.FC<KibanaExportFormProps> = ({
  scriptContent,
  onFormChange,
}) => {
  const { ipc } = useContext(CommunicationContext);
  const [policyOptions, setPolicyOptions] = useState<
    Array<{ text: string; value: string }>
  >([]);
  const [formState, setFormState] = useState<{
    name: string;
    description: string;
    schedule: string;
    policy: string;
  }>({
    name: "Test",
    description: "Example",
    schedule: "@every 3m",
    policy: "",
  });

  const formChangeHandler = useCallback(
    (fieldName: string) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | string) => {
        const value = typeof e === "string" ? e : e.target.value;
        if (!value) return;
        const newFormValues = { ...formState, [fieldName]: value };
        setFormState(newFormValues);
        onFormChange(newFormValues);
      },
    [formState, onFormChange]
  );

  useEffect(() => {
    const fetchPolicyOptions = async () => {
      if (policyOptions.length > 0) return;

      const kibanaUrl: string = await ipc.callMain("get-kibana-url");
      const apiKey: string = await ipc.callMain("get-kibana-api-key");
      const policies = await KibanaClient.getAgentPolicies(kibanaUrl, apiKey);
      const newPolicyOptions = policies.map(({ name: text, id: value }) => ({
        text,
        value,
      }));

      setPolicyOptions(newPolicyOptions);
      const initialPolicyOption = newPolicyOptions[0];
      formChangeHandler("policy")(initialPolicyOption.value);
    };

    fetchPolicyOptions();
  }, [policyOptions.length, setPolicyOptions, ipc, formChangeHandler]);

  return (
    <>
      <EuiForm>
        <EuiSpacer />

        <EuiFormRow label="Monitor name">
          <EuiFieldText name="name" onChange={formChangeHandler("name")} />
        </EuiFormRow>

        <EuiFormRow label="Description">
          <EuiFieldText
            name="description"
            onChange={formChangeHandler("description")}
          />
        </EuiFormRow>

        <EuiFormRow label="Schedule">
          <ScheduleField
            onChange={formChangeHandler("schedule")}
            onBlur={formChangeHandler("schedule")}
          />
        </EuiFormRow>

        <EuiFormRow label="Policy">
          <EuiSelect
            options={policyOptions}
            onChange={formChangeHandler("policy")}
            onBlur={formChangeHandler("policy")}
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );
};
