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
} from "@elastic/eui";
import { CommunicationContext } from "../../contexts/CommunicationContext";
import { KibanaClient, SyntheticSource } from "../../helpers/kibana_client";

type MonitorManagementFlyoutProps = {
  setIsManagementFlyoutVisible: (isVisible: boolean) => void;
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
  // {
  //   field: 'status',
  //   name: 'status',
  //   render: (value) => null,
  // },
  {
    name: "Actions",
    field: "",
    actions: [
      {
        name: "Delete",
        description: "Delete this monitor",
        icon: "trash",
        type: "icon",
        color: "danger",
        onClick: () => 1,
      },
    ],
  },
];

export const MonitorManagementFlyout: React.FC<
  MonitorManagementFlyoutProps
> = ({ setIsManagementFlyoutVisible }) => {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { ipc } = useContext(CommunicationContext);
  const [syntheticSources, setSyntheticSources] = useState<
    Array<SyntheticSource>
  >([]);

  useEffect(() => {
    (async () => {
      const apiKey: string = await ipc.callMain("get-kibana-api-key");
      const kibanaUrl: string = await ipc.callMain("get-kibana-url");
      setSyntheticSources(await KibanaClient.getMonitors(kibanaUrl, apiKey));
    })();
  }, [setSyntheticSources, ipc]);

  const sorting: EuiTableSortingType<SyntheticSource> = {
    sort: {
      field: "name",
      direction: sortDirection,
    },
    enableAllColumns: false,
    readOnly: false,
  };

  const onTableChange = ({ sort }: Criteria<SyntheticSource>) => {
    if (!sort || !sort.direction) return;
    const { direction: sortDirection } = sort;
    setSortDirection(sortDirection);
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsManagementFlyoutVisible(false)}
      aria-labelledby="flyoutTitle"
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
