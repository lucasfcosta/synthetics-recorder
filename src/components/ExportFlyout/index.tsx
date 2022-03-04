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

import React, { useContext, useState } from "react";
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from "@elastic/eui";
import { Steps } from "../Steps";
import { StepsContext } from "../../contexts/StepsContext";
import type { ActionContext, Setter } from "../../common/types";
import { ExportTabs, ExportTabId } from "./ExportTabs";
import { InlineExportFlyoutBody } from "./InlineExportFlyoutBody";
import { SuiteExportFlyoutBody } from "./SuiteExportFlyoutBody";
import { FleetExportFlyoutBody } from "./FleetExportFlyoutBody";
import { ServiceExportFlyoutBody } from "./ServiceExportFlyoutBody";
import { NotificationContext } from "../../contexts/NotificationContext";

type ExportFlyoutBodyComponent = React.FC<{
  tabs: JSX.Element;
  actions: ActionContext[][];
  onSuccess: (title: string, text: string) => void;
}>;

const getFlyoutBodyComponent = (
  tabId: ExportTabId
): ExportFlyoutBodyComponent => {
  if (tabId === "suite") {
    return SuiteExportFlyoutBody;
  } else if (tabId === "inline") {
    return InlineExportFlyoutBody;
  } else if (tabId === "fleet") {
    return FleetExportFlyoutBody;
  } else if (tabId === "service") {
    return ServiceExportFlyoutBody;
  }

  throw new Error("invalid tab id");
};

interface ICodeFlyout {
  actions: ActionContext[][];
  code: string;
  setCode: Setter<string>;
  setIsFlyoutVisible: Setter<boolean>;
}

type Toast = {
  id: string;
  title: React.ReactNode;
  color: "success";
  text?: React.ReactChild;
};

function CodeFlyout({
  actions,
  code,
  setCode,
  setIsFlyoutVisible,
}: ICodeFlyout) {
  const [type, setType] = useState<ExportTabId>("inline");
  const { pushSuccessToast } = useContext(NotificationContext);

  const FlyoutBodyComponent = getFlyoutBodyComponent(type);

  const tabs = <ExportTabs selectedTab={type} setSelectedTab={setType} />;

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsFlyoutVisible(false)}
      aria-labelledby="flyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutTitle">Recorded Code</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <FlyoutBodyComponent
        tabs={tabs}
        actions={actions}
        onSuccess={pushSuccessToast}
      />
    </EuiFlyout>
  );
}

type ExportFlyoutProps = {
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: Setter<boolean>;
};

export const ExportFlyout: React.FC<ExportFlyoutProps> = ({
  isFlyoutVisible,
  setIsFlyoutVisible,
}: ExportFlyoutProps) => {
  const { actions } = useContext(StepsContext);
  const [code, setCode] = useState("");

  return (
    <EuiPanel
      color="transparent"
      borderRadius="none"
      hasBorder={false}
      style={{ minHeight: 500 }}
    >
      <Steps />
      <EuiSpacer />

      {isFlyoutVisible && (
        <CodeFlyout
          actions={actions}
          code={code}
          setCode={setCode}
          setIsFlyoutVisible={setIsFlyoutVisible}
        />
      )}
    </EuiPanel>
  );
};
