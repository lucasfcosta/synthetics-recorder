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

import { EuiButton } from "@elastic/eui";
import React, { useContext } from "react";
import { KibanaClient } from "../helpers/kibana_client";
import { CommunicationContext } from "../contexts/CommunicationContext";

// TODO dedupe this
type PushScriptButtonProps = {
  monitorSettings: {
    name: string;
    description: string;
    schedule: string;
    policy: string;
  };
  scriptContent: string;
};

export const PushScriptButton: React.FC<PushScriptButtonProps> = ({
  monitorSettings,
  scriptContent,
}) => {
  const { ipc } = useContext(CommunicationContext);

  const onClick = async () => {
    const kibanaUrl: string = await ipc.callMain("get-kibana-url");
    const apiKey: string = await ipc.callMain("get-kibana-api-key");
    await KibanaClient.pushMonitor(
      kibanaUrl,
      apiKey,
      monitorSettings,
      scriptContent
    );
  };

  return (
    <EuiButton fill color="primary" iconType="logoKibana" onClick={onClick}>
      Push to Kibana
    </EuiButton>
  );
};
