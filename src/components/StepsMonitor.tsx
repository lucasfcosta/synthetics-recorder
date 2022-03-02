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

import React, { useContext, useEffect, useState } from "react";
import {
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiLoadingSpinner,
  EuiGlobalToastList,
} from "@elastic/eui";
import { getCodeFromActions } from "../common/shared";
import { Steps } from "./Steps";
import { StepsContext } from "../contexts/StepsContext";
import type { ActionContext, JourneyType, Setter } from "../common/types";
import { CommunicationContext } from "../contexts/CommunicationContext";
import { ExportScriptButton } from "./ExportScriptButton";
import { PushScriptButton } from "./PushScriptButton";
import { KibanaExportForm } from "./KibanaExportForm";

type CodeTab = JourneyType | "kibana";

interface IRecordedCodeTabs {
  selectedTab: CodeTab;
  setSelectedTab: Setter<CodeTab>;
}

interface RecordedCodeTab {
  id: CodeTab;
  name: "Inline" | "Suite" | "Kibana";
}

function RecordedCodeTabs({ selectedTab, setSelectedTab }: IRecordedCodeTabs) {
  const tabs: RecordedCodeTab[] = [
    {
      id: "inline",
      name: "Inline",
    },
    {
      id: "suite",
      name: "Suite",
    },
    {
      id: "kibana",
      name: "Kibana",
    },
  ];

  return (
    <EuiTabs>
      {tabs.map(({ id, name }) => (
        <EuiTab
          key={id}
          onClick={() => {
            if (selectedTab !== id) {
              setSelectedTab(id);
            }
          }}
          isSelected={selectedTab === id}
        >
          {name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
}

const PushLoadingScreen = () => {
  return (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      direction="column"
      style={{ marginTop: 120, width: "100%" }}
    >
      <EuiLoadingSpinner size="l" />
      <EuiSpacer />
      <p>Pushing monitor...</p>
    </EuiFlexGroup>
  );
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
  const { ipc } = useContext(CommunicationContext);
  const [toasts, setToasts] = useState<Array<Toast>>([]);
  const [type, setType] = useState<CodeTab>("inline");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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

  useEffect(() => {
    (async function getCode() {
      const codeType: JourneyType = type === "suite" ? "suite" : "inline";
      const codeFromActions = await getCodeFromActions(ipc, actions, codeType);
      setCode(codeFromActions);
    })();
  }, [actions, setCode, type, ipc]);

  const addPushSuccessToast = (monitorName: string) => {
    const newToast = {
      id: monitorName,
      color: "success" as const,
      title: `Monitor ${monitorName} pushed successfully`,
      text: "You can now see this new monitor in Kibana's Uptime app.",
    };
    setToasts(toasts.concat(newToast));
  };

  const removeToast = (deletedToast: { id: string }) => {
    setToasts(toasts.filter(t => t.id !== deletedToast.id));
  };

  const exportButton =
    type === "kibana" ? (
      <PushScriptButton
        monitorSettings={formState}
        scriptContent={code}
        onPushStateChange={(isLoading, monitorName) => {
          setIsSubmitting(isLoading);
          if (!isLoading) addPushSuccessToast(monitorName);
        }}
      />
    ) : (
      <ExportScriptButton scriptContent={code} />
    );
  const flyoutBody =
    type === "kibana" ? (
      <KibanaExportForm scriptContent={code} onFormChange={setFormState} />
    ) : (
      <EuiCodeBlock language="js" paddingSize="m" isCopyable>
        {code}
      </EuiCodeBlock>
    );

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
      <EuiFlyoutBody>
        <RecordedCodeTabs selectedTab={type} setSelectedTab={setType} />
        {!isSubmitting ? flyoutBody : <PushLoadingScreen />}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>{exportButton}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      <EuiGlobalToastList
        toasts={toasts}
        dismissToast={removeToast}
        toastLifeTimeMs={6000}
      />
    </EuiFlyout>
  );
}

interface IStepsMonitor {
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: Setter<boolean>;
}

export function StepsMonitor({
  isFlyoutVisible,
  setIsFlyoutVisible,
}: IStepsMonitor) {
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
}
