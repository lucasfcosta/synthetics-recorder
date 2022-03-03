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
import type { ActionContext, ServiceMonitorSettings } from "../../common/types";
import { getCodeFromActions } from "../../common/shared";
import { ServiceExportForm } from "./ServiceExportForm";
import { PushScriptButton } from "../PushScriptButton";
import { ExportLoadingPanel } from "./ExportLoadingPanel";
import { KibanaClient } from "../../helpers/kibana_client";

type ServiceExportFlyoutBodyProps = {
  tabs: JSX.Element;
  actions: ActionContext[][];
  onSuccess: (monitorName: string) => void;
};

export const ServiceExportFlyoutBody: React.FC<
  ServiceExportFlyoutBodyProps
> = ({ tabs, actions, onSuccess }) => {
  const { ipc } = useContext(CommunicationContext);
  const [code, setCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formState, setFormState] = useState<ServiceMonitorSettings>({
    name: "Test",
    schedule: "@every 3m",
  });

  useEffect(() => {
    (async function getCode() {
      const codeFromActions = await getCodeFromActions(ipc, actions, "inline");
      setCode(codeFromActions);
    })();
  }, [actions, setCode, ipc]);

  const content = isLoading ? (
    <ExportLoadingPanel />
  ) : (
    <ServiceExportForm onFormChange={setFormState} />
  );

  const onClick = async () => {
    const kibanaUrl: string = await ipc.callMain("get-kibana-url");
    const apiKey: string = await ipc.callMain("get-kibana-api-key");
    setIsLoading(true);
    await KibanaClient.pushMonitorToService(kibanaUrl, apiKey, formState, code);
    setIsLoading(false);
    onSuccess(formState.name);
  };

  return (
    <>
      <EuiFlyoutBody>
        {tabs}
        {content}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <PushScriptButton onClick={onClick} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
