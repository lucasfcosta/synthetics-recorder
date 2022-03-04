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

import React, { useState, useEffect, useContext } from "react";
import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
} from "@elastic/eui";
import { CommunicationContext } from "../../contexts/CommunicationContext";
import type {
  ActionContext,
  ServiceMonitorSettings,
  ServiceLocation,
} from "../../common/types";
import { getCodeFromActions } from "../../common/shared";
import { ServiceExportForm } from "./ServiceExportForm";
import { PushScriptButton } from "../PushScriptButton";
import { RunOnceButton } from "../RunOnceButton";
import { ExportLoadingPanel } from "./ExportLoadingPanel";
import { KibanaClient, RunOnceQueryHit } from "../../helpers/kibana_client";
import { useIsMounted } from "../../hooks/useIsMounted";

type ServiceExportFlyoutBodyProps = {
  tabs: JSX.Element;
  actions: ActionContext[][];
  onSuccess: (title: string, text: string) => void;
};

const findSummary = (hits: Array<RunOnceQueryHit>) => {
  return hits.find(hit => hit._source.synthetics.type === "heartbeat/summary");
};

export const ServiceExportFlyoutBody: React.FC<
  ServiceExportFlyoutBodyProps
> = ({ tabs, actions, onSuccess }) => {
  const { ipc } = useContext(CommunicationContext);
  const [code, setCode] = useState<string>("");
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isRunningOnce, setIsRunningOnce] = useState<boolean>(false);
  const [runningOnceStarted, setRunningOnceStarted] = useState<boolean>(false);
  const [locations, setLocations] = useState<Array<ServiceLocation>>([]);
  const isMounted = useIsMounted();

  const [formState, setFormState] = useState<ServiceMonitorSettings>({
    name: "Test",
    number: "3",
    unit: "m",
    locations: [],
  });

  useEffect(() => {
    const fetchLocations = async () => {
      if (locations.length > 0) return;

      const kibanaUrl: string = await ipc.callMain("get-kibana-url");
      const apiKey: string = await ipc.callMain("get-kibana-api-key");
      const newLocations = await KibanaClient.getServiceLocations(
        kibanaUrl,
        apiKey
      );

      setLocations(newLocations);

      setFormState({ ...formState, locations: [newLocations[0]] });
    };

    fetchLocations();
  });

  useEffect(() => {
    (async function getCode() {
      const codeFromActions = await getCodeFromActions(ipc, actions, "inline");
      setCode(codeFromActions);
    })();
  }, [actions, setCode, ipc]);

  const pushToKibana = async () => {
    const kibanaUrl: string = await ipc.callMain("get-kibana-url");
    const apiKey: string = await ipc.callMain("get-kibana-api-key");
    setIsPushing(true);
    await KibanaClient.pushMonitorToService(kibanaUrl, apiKey, formState, code);
    setIsPushing(false);
    onSuccess(
      `Monitor "${formState.name}" pushed successfully`,
      "You can see this monitor in Kibana."
    );
  };

  const runOnce = async () => {
    const kibanaUrl: string = await ipc.callMain("get-kibana-url");
    const apiKey: string = await ipc.callMain("get-kibana-api-key");
    setIsRunningOnce(true);
    const { uuid: runOnceUuid } = await KibanaClient.runMonitorOnce(
      kibanaUrl,
      apiKey,
      formState,
      code
    );

    let runOnceResults = await KibanaClient.fetchRunOnceResults(
      kibanaUrl,
      apiKey,
      runOnceUuid
    );

    while (!findSummary(runOnceResults.hits)) {
      if (runOnceResults.total > 0) setRunningOnceStarted(true);

      if (!isMounted()) return;
      await new Promise(resolve => setTimeout(resolve, 3000));
      runOnceResults = await KibanaClient.fetchRunOnceResults(
        kibanaUrl,
        apiKey,
        runOnceUuid
      );
    }

    setIsRunningOnce(false);
    onSuccess(
      `Monitor "${formState.name}" ran remotely.`,
      "This monitor is ready to be pushed."
    );
  };

  const onFormChange = (changedFields: Record<string, string>) => {
    const updateFieldValue = (fieldName: string, value: string) => {
      if (fieldName === "locationId") {
        const selectedLocation = locations.find(l => l.id === value);
        if (!selectedLocation) return;
        return [selectedLocation];
      }

      return value;
    };

    const newState = Object.entries(changedFields).reduce(
      (acc, [fieldName, value]) => {
        return { ...acc, [fieldName]: updateFieldValue(fieldName, value) };
      },
      { ...formState }
    );

    setFormState(newState as ServiceMonitorSettings);
  };

  const runningOnceMessage = runningOnceStarted
    ? "Your monitor is running remotely... "
    : "Pushing monitor to the service...";

  const content =
    isPushing || isRunningOnce ? (
      <ExportLoadingPanel message={isRunningOnce ? runningOnceMessage : null} />
    ) : (
      <ServiceExportForm locations={locations} onFormChange={onFormChange} />
    );

  return (
    <>
      <EuiFlyoutBody>
        {tabs}
        {content}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <RunOnceButton onClick={runOnce} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PushScriptButton onClick={pushToKibana} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
