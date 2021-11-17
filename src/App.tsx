import { useEffect, useState } from "react";
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
} from "@elastic/eui";
import "./App.css";
import "@elastic/eui/dist/eui_theme_amsterdam_light.css";
import { Header } from "./components/Header";
import { StepsMonitor } from "./components/StepsMonitor";
import { TestResult } from "./components/TestResult";
import { RecordingContext } from "./contexts/RecordingContext";
import { AssertionDrawer } from "./components/AssertionDrawer";
import { AssertionContext } from "./contexts/AssertionContext";
import { StepsContext } from "./contexts/StepsContext";
import { useAssertionDrawer } from "./hooks/useAssertionDrawer";
import { createExternalLinkHandler } from "./common/shared";
import type { ActionContext, JourneyType } from "./common/types";
import { generateIR, generateMergedIR } from "./helpers/generator";

const { ipcRenderer: ipc } = window.require("electron-better-ipc");

const MAIN_CONTROLS_MIN_WIDTH = 600;

const SYNTHETICS_DISCUSS_FORUM_URL =
  "https://discuss.elastic.co/tags/c/observability/uptime/75/synthetics";

export default function App() {
  const [url, setUrl] = useState("");
  const [stepActions, setStepActions] = useState<ActionContext[][]>([]);
  const [type, setJourneyType] = useState<JourneyType>("inline");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const assertionDrawerUtils = useAssertionDrawer();

  const onUrlChange = (value: string) => {
    setUrl(value);
  };

  useEffect(() => {
    ipc.answerMain("change", ({ actions }: { actions: ActionContext[] }) => {
      setStepActions(prevActionContexts => {
        const currActionsContexts = generateIR(actions);
        return generateMergedIR(prevActionContexts, currActionsContexts);
      });
    });
  }, [setStepActions]);

  return (
    <div style={{ padding: 4 }}>
      <StepsContext.Provider
        value={{
          actions: stepActions,
          onDeleteAction: (sIdx: number, aIdx: number) => {
            setStepActions(value =>
              value.map((s: ActionContext[], idx: number) => {
                if (idx !== sIdx) return s;
                s.splice(aIdx, 1);
                return [...s];
              })
            );
          },
          setActions: setStepActions,
        }}
      >
        <AssertionContext.Provider value={assertionDrawerUtils}>
          <RecordingContext.Provider
            value={{
              isRecording,
              toggleRecording: async () => {
                if (isRecording) {
                  setIsRecording(false);
                  setIsPaused(false);
                  // Stop browser process
                  ipc.send("stop");
                } else {
                  setIsRecording(true);
                  await ipc.callMain("record-journey", { url });
                  setIsRecording(false);
                  setIsPaused(false);
                }
              },
              isPaused,
              togglePause: async () => {
                if (!isRecording) return;
                if (!isPaused) {
                  setIsPaused(true);
                  await ipc.callMain("set-mode", "none");
                } else {
                  await ipc.callMain("set-mode", "recording");
                  setIsPaused(false);
                }
              },
            }}
          >
            <EuiPageTemplate
              pageHeader={{
                bottomBorder: true,
                // the bottom border didn't grow without providing a value for
                // `restrictWidth`. We always want there to be a border and we
                // always want the header to fill the full width.
                restrictWidth: 4000,
                pageTitle: (
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiIcon size="xxl" type="logoElastic" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>Script recorder</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBetaBadge
                        style={{ marginTop: 10 }}
                        label="BETA"
                        color="accent"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
                paddingSize: "s",
                rightSideItems: [
                  <EuiLink
                    key="link-to-synthetics-help"
                    href={SYNTHETICS_DISCUSS_FORUM_URL}
                    style={{ marginTop: 16 }}
                    onClick={createExternalLinkHandler(
                      SYNTHETICS_DISCUSS_FORUM_URL
                    )}
                  >
                    Send feedback
                  </EuiLink>,
                ],
              }}
            >
              <EuiSpacer />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup direction="column">
                    <EuiFlexItem grow={false}>
                      <Header url={url} onUrlChange={onUrlChange} />
                    </EuiFlexItem>
                    <EuiFlexItem style={{ minWidth: MAIN_CONTROLS_MIN_WIDTH }}>
                      <StepsMonitor />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem style={{ minWidth: 300 }}>
                  <TestResult setType={setJourneyType} type={type} />
                </EuiFlexItem>
              </EuiFlexGroup>
              <AssertionDrawer />
            </EuiPageTemplate>
          </RecordingContext.Provider>
        </AssertionContext.Provider>
      </StepsContext.Provider>
    </div>
  );
}