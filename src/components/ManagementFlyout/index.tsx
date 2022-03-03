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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiTitle,
  EuiBasicTable,
  Criteria,
  EuiTableSortingType,
  EuiBadge,
  EuiButtonIcon,
  EuiPopover,
} from "@elastic/eui";
import { CommunicationContext } from "../../contexts/CommunicationContext";
import { KibanaClient } from "../../helpers/kibana_client";
import { StatusPopover } from "./StatusPopover";

type MonitorManagementFlyoutProps = {
  setIsManagementFlyoutVisible: (isVisible: boolean) => void;
};

// TODO constrain type and status to a particular range of strings
type SyntheticSourceRow = {
  name: string;
  id: string;
  type: string;
  status: string;
};

export const MonitorManagementFlyout: React.FC<
  MonitorManagementFlyoutProps
> = ({ setIsManagementFlyoutVisible }) => {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusPopoverId, setStatusPopoverId] = useState<string | undefined>();
  const { ipc } = useContext(CommunicationContext);
  const [syntheticSources, setSyntheticSources] = useState<
    Array<SyntheticSourceRow>
  >([]);

  useEffect(() => {
    (async () => {
      const apiKey: string = await ipc.callMain("get-kibana-api-key");
      const kibanaUrl: string = await ipc.callMain("get-kibana-url");
      const monitorSummaries = await KibanaClient.getMonitorSummaries(
        kibanaUrl,
        apiKey
      );
      const monitorSources = (
        await Promise.all([
          KibanaClient.getMonitors(kibanaUrl, apiKey),
          KibanaClient.getServiceMonitors(kibanaUrl, apiKey),
        ])
      ).flatMap(sources => {
        return sources.map(source => {
          const sourceSummary = monitorSummaries.find(summary => {
            return summary.monitor_id === source.id;
          });

          const sourceStatus =
            sourceSummary && sourceSummary.state.summary
              ? sourceSummary.state.summary.status
              : "unknown";

          if ("attributes" in source) {
            return {
              name: source.attributes.name,
              id: source.id,
              type: "service",
              status: sourceStatus,
            };
          }

          return {
            name: source.name,
            id: source.id,
            type: "fleet",
            status: sourceStatus,
          };
        });
      });

      setSyntheticSources(monitorSources);
    })();
  }, [setSyntheticSources, ipc]);

  const sorting: EuiTableSortingType<SyntheticSourceRow> = {
    sort: {
      field: "name",
      direction: sortDirection,
    },
    enableAllColumns: false,
    readOnly: false,
  };

  const monitorColumns = [
    {
      field: "name",
      name: "Name",
      sortable: true,
    },
    {
      field: "id",
      name: "ID",
    },
    {
      field: "type",
      name: "Type",
      render: (type: string) => {
        if (type === "fleet") {
          return <EuiBadge color="default">Fleet</EuiBadge>;
        } else {
          return <EuiBadge color="hollow">Service</EuiBadge>;
        }
      },
    },
    {
      field: "status",
      name: "Status",
      render: (status: string) => {
        if (status === "up") {
          return <EuiBadge color="success">Up</EuiBadge>;
        } else if (status === "down") {
          return <EuiBadge color="danger">Down</EuiBadge>;
        } else {
          return <EuiBadge color="warning">Unknown</EuiBadge>;
        }
      },
    },
    {
      field: "id",
      name: "Detail",
      render: (id: string, item: SyntheticSourceRow) => {
        return (
          <EuiPopover
            button={
              <EuiButtonIcon
                aria-label="Click this button to view screenshot and additional detail for this monitor"
                onClick={() => setStatusPopoverId(id)}
                iconType="indexRuntime"
              />
            }
            closePopover={() => setStatusPopoverId(undefined)}
            anchorPosition="leftUp"
            isOpen={!!statusPopoverId && statusPopoverId === id}
          >
            <StatusPopover monitorId={id} monitorName={item.name} />
          </EuiPopover>
        );
      },
    },
    {
      name: "Actions",
      field: "",
      actions: [
        {
          name: "Edit",
          description: "Edit this monitor",
          icon: "pencil",
          type: "icon",
          color: "primary",
          onClick: async (item: SyntheticSourceRow) =>
            ipc.callMain(
              "link-to-external",
              `${await ipc.callMain(
                "get-kibana-url"
              )}/app/uptime/edit-monitor/${btoa(item.id)}`
            ),
        },
        {
          name: "Delete",
          description: "Delete this monitor",
          icon: "trash",
          type: "icon",
          color: "danger",
          onClick: async (item: SyntheticSourceRow) => {
            const apiKey: string = await ipc.callMain("get-kibana-api-key");
            const kibanaUrl: string = await ipc.callMain("get-kibana-url");
            // TODO loading state when deleting
            setSyntheticSources(
              syntheticSources.filter(source => source.id !== item.id)
            );

            if (item.type === "fleet") {
              await KibanaClient.deleteMonitor(kibanaUrl, apiKey, item.id);
            } else {
              await KibanaClient.deleteServiceMonitor(
                kibanaUrl,
                apiKey,
                item.id
              );
            }
          },
        },
      ],
    },
  ];

  const onTableChange = ({ sort }: Criteria<SyntheticSourceRow>) => {
    if (!sort || !sort.direction) return;
    const { direction: sortDirection } = sort;
    setSortDirection(sortDirection);
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsManagementFlyoutVisible(false)}
      aria-labelledby="flyoutTitle"
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutTitle">Manage Monitors</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiBasicTable
          tableCaption="Demo for responsive EuiBasicTable with mobile options"
          items={syntheticSources}
          itemId="id"
          columns={monitorColumns}
          sorting={sorting}
          hasActions={true}
          onChange={onTableChange}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}></EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
