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

import React, { useState, useCallback } from "react";
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
import type {
  ServiceMonitorSettings,
  ServiceLocation,
} from "../../common/types";

type TimeUnits = "s" | "m";

interface ScheduleFieldProps {
  onChange: (number: string, unit: string) => void;
  onBlur: (number: string, unit: string) => void;
}

export const ScheduleField = ({ onChange, onBlur }: ScheduleFieldProps) => {
  const [unit, setUnit] = useState<TimeUnits>("m");
  const [n, setN] = useState<number>(3);

  const options = [{ text: "Minutes", value: "m" }];

  const onNumberUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const updatedNumber =
      event.target.value === null ? 0 : parseInt(event.target.value);
    setN(updatedNumber);
    onChange(updatedNumber.toString(), unit);
  };

  const onUnitUpdate = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedUnit = event.target.value as TimeUnits;
    setUnit(updatedUnit);
    onChange(n.toString(), updatedUnit);
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

type ServiceMonitorSettingsFormValues = Omit<
  ServiceMonitorSettings,
  "locations" | "schedule"
> & { locationId: string; number: string; unit: string };

type ServiceExportFormProps = {
  onFormChange: (changedFields: Record<string, string>) => void;
  locations: Array<ServiceLocation>;
};

// TODO better handling of default values here
export const ServiceExportForm: React.FC<ServiceExportFormProps> = ({
  locations,
  onFormChange,
}) => {
  const [formState, setFormState] = useState<ServiceMonitorSettingsFormValues>({
    name: "Test",
    number: "3",
    unit: "m",
    locationId: "",
  });

  const formChangeHandler = useCallback(
    (fieldName: string) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | string) => {
        const value =
          typeof e === "object" && "target" in e ? e.target.value : e;
        if (!value) return;

        const newFormValues = { ...formState, [fieldName]: value };
        setFormState(newFormValues);
        onFormChange({ [fieldName]: value });
      },
    [formState, onFormChange]
  );

  const scheduleChangeHandler = useCallback(
    (number, unit) => {
      setFormState({ ...formState, unit, number });
      onFormChange({ number, unit });
    },
    [formState, setFormState, onFormChange]
  );

  const locationOptions = locations.map(location => ({
    text: location.label,
    value: location.id,
  }));

  return (
    <EuiForm>
      <EuiSpacer />

      <EuiFormRow label="Monitor name">
        <EuiFieldText name="name" onChange={formChangeHandler("name")} />
      </EuiFormRow>

      <EuiFormRow label="Schedule">
        <ScheduleField
          onChange={scheduleChangeHandler}
          onBlur={scheduleChangeHandler}
        />
      </EuiFormRow>

      <EuiFormRow label="Policy">
        <EuiSelect
          options={locationOptions}
          onChange={formChangeHandler("locationId")}
          onBlur={formChangeHandler("locationId")}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
