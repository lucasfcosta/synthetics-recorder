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
import axios from "axios";
import { CommunicationContext } from "../../contexts/CommunicationContext";
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

interface Props {
  monitorId: string;
  monitorName: string;
}

interface PingsResponse {
  pings: Array<{
    monitor: { check_group: string; duration: { us: number } };
    timestamp: string;
  }>;
}

interface JourneyResponse {
  steps: Array<{
    synthetics: { isScreenshotRef: boolean };
  }>;
}

interface Block {
  top: number;
  width: number;
  left: number;
  height: number;
  hash: string;
}

interface RefResult {
  screenshotRef: {
    screenshot_ref: {
      blocks: Block[];
      height: number;
      width: number;
    };
  };
}

interface BlockBlob {
  id: string;
  synthetics: {
    blob: string;
  };
}

export function StatusPopover({ monitorId, monitorName }: Props) {
  const [imageData, setImageData] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState("");
  const [loading, setLoading] = useState(true);
  const { ipc } = useContext(CommunicationContext);

  useEffect(() => {
    async function fetchScreenshots() {
      setImageData([]);
      const [apiKey, kibanaUrl] = await Promise.all([
        ipc.callMain("get-kibana-api-key"),
        ipc.callMain("get-kibana-url"),
      ]);
      const pingsResponse = await axios.get<PingsResponse>(
        `${kibanaUrl}/internal/uptime/pings?monitorId=${monitorId}&from=now-5m&to=now&sort=desc&size=1`,
        {
          headers: { Authorization: `ApiKey ${apiKey}` },
        }
      );
      if (!pingsResponse.data.pings.length) return;
      const { check_group } = pingsResponse.data.pings[0].monitor;
      const journeyResponse = await axios.get<JourneyResponse>(
        `${kibanaUrl}/internal/uptime/journey/${check_group}`,
        {
          headers: { Authorization: `ApiKey ${apiKey}` },
        }
      );
      const screenshotRefIndexes = journeyResponse.data.steps
        .map((step, index) => {
          if (step?.synthetics?.isScreenshotRef) return index + 1;
          return undefined;
        })
        .filter(f => !!f);

      const refResults = await Promise.all(
        screenshotRefIndexes.map(ind => {
          return axios.get<RefResult>(
            `${kibanaUrl}/internal/uptime/journey/screenshot/${check_group}/${ind}`,
            {
              headers: { Authorization: `ApiKey ${apiKey}` },
            }
          );
        })
      );
      const refs = refResults.map(res => res.data.screenshotRef);
      const rawHashes: string[] = refs.reduce<string[]>((blocks, ref) => {
        return [
          ...blocks,
          ...ref.screenshot_ref.blocks.map(
            ({ hash }: { hash: string }) => hash
          ),
        ];
      }, []);
      const hashes = Array.from(new Set(rawHashes));
      const blocksResponse = await axios.post<BlockBlob[]>(
        `${kibanaUrl}/internal/uptime/journey/screenshot/block`,
        { hashes },
        {
          headers: {
            Authorization: `ApiKey ${apiKey}`,
            "Content-Type": "application/json",
            "kbn-xsrf": true,
          },
        }
      );
      const blocksMap: Record<string, BlockBlob> = blocksResponse.data.reduce(
        (map: object, block) => {
          return { ...map, [block.id]: block };
        },
        {}
      );
      const nextImageData: string[] = [];
      for (const ref of refs) {
        const { blocks, height, width } = ref.screenshot_ref;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { alpha: false });
        canvas.width = width;
        canvas.height = height;
        /**
         * We need to treat each operation as an async task, otherwise we will race between drawing image
         * chunks and extracting the final data URL from the canvas; without this, the image could be blank or incomplete.
         */
        const drawOperations: Array<Promise<void>> = [];

        for (const { hash, top, left, width, height } of blocks) {
          drawOperations.push(
            new Promise<void>((resolve, reject) => {
              const img = new Image();
              const blockBlob = blocksMap[hash];
              if (!blockBlob) {
                reject(
                  Error(
                    `Error processing image. Expected image data with hash ${hash} is missing`
                  )
                );
              } else {
                img.onload = () => {
                  ctx?.drawImage(img, left, top, width, height);
                  resolve();
                };
                img.src = `data:image/jpg;base64,${blockBlob.synthetics.blob}`;
              }
            })
          );
        }
        await Promise.all(drawOperations);
        nextImageData.push(canvas.toDataURL("image/jpeg"));
        canvas.parentElement?.removeChild(canvas);
      }
      setDuration(pingsResponse.data.pings[0].monitor.duration.us);
      setTimestamp(pingsResponse.data.pings[0].timestamp);
      setImageData(nextImageData);
      setLoading(false);
    }

    fetchScreenshots();
  }, [ipc, monitorId]);

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
