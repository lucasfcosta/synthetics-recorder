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

import React from "react";
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
  EuiText,
} from "@elastic/eui";
import moment from "moment";
import { useScreenshots } from "../../hooks/useScreenshots";

interface Props {
  monitorId: string;
  monitorName: string;
}

export function StatusPopover({ monitorId, monitorName }: Props) {
  const { imageData, duration, timestamp, loading } = useScreenshots(monitorId);

  if (loading)
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>Fetching the goodness 🚚</EuiFlexItem>
      </EuiFlexGroup>
    );

  return imageData.length ? (
    <EuiPanel
      hasBorder={false}
      grow={false}
      style={{ height: "300px", overflow: "scroll" }}
    >
      <EuiTitle size="s">
        <h5>{monitorName}</h5>
      </EuiTitle>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            Duration: {duration ? Math.round(duration / 1000 / 1000) : 0}s
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          Ran: {moment(timestamp).format("MMMM Do YYYY, h:mm:ss a")}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column">
        {imageData.map((img, ind) => (
          <EuiFlexItem grow={false} key={ind}>
            <EuiImage alt="Screenshot for monitor" url={img} size="l" />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  ) : (
    <div>No image data</div>
  );
}
