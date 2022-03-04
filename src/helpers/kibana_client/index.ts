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

import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import type {
  FleetMonitorSettings,
  ServiceMonitorSettings,
  ServiceLocation,
} from "../../common/types";

type KibanaResponse<T> = {
  data: T;
};

type FleetPolicy = {
  items: Array<{ id: string; name: string }>;
};

type PackageInstallations = {
  item: {
    package_policies: Array<SyntheticSource>;
  };
};

export type SyntheticSource = {
  name: string;
  id: string;
  package: { name: string };
  inputs: Array<{ type: string; enabled: boolean }>;
};

export type ServiceMonitor = {
  id: string;
  attributes: {
    type: string;
    name: string;
  };
};

export type MonitorSummary = {
  monitor_id: string;
  state: { summary?: { status: string } };
};

export type RunOnceResults = {
  result: {
    rawResponse: {
      hits: {
        total: number;
        hits: Array<RunOnceQueryHit>;
      };
    };
  };
};

export type RunOnceQueryHit = {
  _source: {
    synthetics: {
      type: string;
    };
  };
};

// TODO create instances with API KEY and URL instead of always passing it in

export class KibanaClient {
  static async getAgentPolicies(baseUrl: string, apiKey: string) {
    const {
      data: { items: policies },
    }: KibanaResponse<FleetPolicy> = await axios.get(
      `${baseUrl}/api/fleet/agent_policies?perPage=100`,
      {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );

    return policies;
  }

  static async getMonitors(baseUrl: string, apiKey: string) {
    const policies = await KibanaClient.getAgentPolicies(baseUrl, apiKey);

    const installFetches = policies.map(
      async ({ id: policyId }: { id: string }) => {
        const {
          data: {
            item: { package_policies: packageInstallations },
          },
        }: KibanaResponse<PackageInstallations> = await axios.get(
          `${baseUrl}/api/fleet/agent_policies/${policyId}`,
          {
            headers: {
              Authorization: `ApiKey ${apiKey}`,
            },
          }
        );

        return packageInstallations.filter(monitorSource => {
          const isSyntheticsPackage =
            monitorSource.package.name === "synthetics";

          const browserInput = monitorSource.inputs.find(({ type }) => {
            return type === "synthetics/browser";
          });

          const isBrowserMonitor = browserInput && browserInput.enabled;

          return isSyntheticsPackage && isBrowserMonitor;
        });
      }
    );

    return (await Promise.all(installFetches)).flatMap(x => x);
  }

  static async getServiceMonitors(baseUrl: string, apiKey: string) {
    const serviceMonitorsResponse: KibanaResponse<{
      monitors: Array<ServiceMonitor>;
    }> = await axios.get(
      `${baseUrl}/internal/uptime/service/monitors?perPage=100`,
      {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );

    return serviceMonitorsResponse.data.monitors.filter(monitor => {
      return monitor.attributes.type === "browser";
    });
  }

  static async deleteServiceMonitor(
    baseUrl: string,
    apiKey: string,
    monitorId: string
  ) {
    await axios.delete(
      `${baseUrl}/internal/uptime/service/monitors/${monitorId}`,
      {
        headers: {
          "kbn-xsrf": "xxx",
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );
  }

  static async deleteMonitor(
    baseUrl: string,
    apiKey: string,
    policyId: string
  ) {
    await axios.post(
      `${baseUrl}/api/fleet/package_policies/delete`,
      {
        packagePolicyIds: [policyId],
      },
      {
        headers: {
          "kbn-xsrf": "xxx",
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );
  }

  static async pushMonitor(
    baseUrl: string,
    apiKey: string,
    monitorSettings: FleetMonitorSettings,
    scriptContent: string
  ) {
    const payload = {
      name: monitorSettings.name,
      description: monitorSettings.description,
      // TODO check if we can pass namespace from Kibana
      namespace: "default",
      policy_id: monitorSettings.policy,
      enabled: true,
      output_id: "",
      inputs: [
        {
          type: "synthetics/browser",
          policy_template: "synthetics",
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: "synthetics", dataset: "browser" },
              vars: {
                __ui: {
                  value:
                    '{"script_source":{"is_generated_script":false,"file_name":""},"is_zip_url_tls_enabled":false,"is_tls_enabled":false}',
                  type: "yaml",
                },
                enabled: { value: true, type: "bool" },
                type: { value: "browser", type: "text" },
                name: { value: monitorSettings.name, type: "text" },
                schedule: {
                  value: `"${monitorSettings.schedule}"`,
                  type: "text",
                },
                "service.name": { value: "", type: "text" },
                timeout: { value: null, type: "text" },
                tags: { value: null, type: "yaml" },
                "source.zip_url.url": { value: "", type: "text" },
                "source.zip_url.username": { value: "", type: "text" },
                "source.zip_url.folder": { value: "", type: "text" },
                "source.zip_url.password": { value: "", type: "password" },
                "source.inline.script": {
                  value: scriptContent,
                  type: "yaml",
                },
                params: { value: "", type: "yaml" },
                screenshots: { value: "on", type: "text" },
                synthetics_args: { value: null, type: "text" },
                ignore_https_errors: { value: false, type: "bool" },
                "throttling.config": { value: "5d/3u/20l", type: "text" },
                "filter_journeys.tags": { value: null, type: "yaml" },
                "filter_journeys.match": { value: null, type: "text" },
                "source.zip_url.ssl.certificate_authorities": {
                  value: null,
                  type: "yaml",
                },
                "source.zip_url.ssl.certificate": { value: null, type: "yaml" },
                "source.zip_url.ssl.key": { value: null, type: "yaml" },
                "source.zip_url.ssl.key_passphrase": {
                  value: null,
                  type: "text",
                },
                "source.zip_url.ssl.verification_mode": {
                  value: null,
                  type: "text",
                },
                "source.zip_url.ssl.supported_protocols": {
                  value: null,
                  type: "yaml",
                },
                "source.zip_url.proxy_url": { value: "", type: "text" },
              },
            },
            {
              enabled: true,
              data_stream: { type: "synthetics", dataset: "browser.network" },
            },
            {
              enabled: true,
              data_stream: {
                type: "synthetics",
                dataset: "browser.screenshot",
              },
            },
          ],
        },
      ],
      package: {
        name: "synthetics",
        title: "Elastic Synthetics",
        version: "0.9.2",
      },
    };

    await axios.post(`${baseUrl}/api/fleet/package_policies`, payload, {
      headers: {
        "kbn-xsrf": "xxx",
        Authorization: `ApiKey ${apiKey}`,
      },
    });
  }

  static async getServiceLocations(baseUrl: string, apiKey: string) {
    const response: KibanaResponse<{ locations: Array<ServiceLocation> }> =
      await axios.get(`${baseUrl}/internal/uptime/service/locations`, {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      });

    return response.data.locations;
  }

  static async pushMonitorToService(
    baseUrl: string,
    apiKey: string,
    monitorSettings: ServiceMonitorSettings,
    scriptContent: string
  ) {
    const payload = {
      type: "browser",
      locations: monitorSettings.locations,
      enabled: true,
      schedule: { number: monitorSettings.number, unit: monitorSettings.unit },
      "service.name": "",
      tags: [],
      timeout: null,
      name: monitorSettings.name,
      namespace: "default",
      __ui: {
        script_source: { is_generated_script: false, file_name: "" },
        is_zip_url_tls_enabled: false,
        is_tls_enabled: false,
      },
      "source.zip_url.url": "",
      "source.zip_url.username": "",
      "source.zip_url.password": "",
      "source.zip_url.folder": "",
      "source.zip_url.proxy_url": "",
      "source.inline.script": scriptContent,
      params: "",
      screenshots: "on",
      synthetics_args: [],
      "filter_journeys.match": "",
      "filter_journeys.tags": [],
      ignore_https_errors: false,
      "throttling.is_enabled": true,
      "throttling.download_speed": "5",
      "throttling.upload_speed": "3",
      "throttling.latency": "20",
      "throttling.config": "5d/3u/20l",
    };

    await axios.post(`${baseUrl}/internal/uptime/service/monitors`, payload, {
      headers: {
        "kbn-xsrf": "xxx",
        Authorization: `ApiKey ${apiKey}`,
      },
    });
  }

  static async getMonitorSummaries(baseUrl: string, apiKey: string) {
    const { data }: KibanaResponse<{ summaries: Array<MonitorSummary> }> =
      await axios.get(
        `${baseUrl}/internal/uptime/monitor/list?dateRangeStart=now-15m&pageSize=100&dateRangeEnd=now`,
        {
          headers: {
            Authorization: `ApiKey ${apiKey}`,
          },
        }
      );

    return data.summaries;
  }

  static async runMonitorOnce(
    baseUrl: string,
    apiKey: string,
    monitorSettings: ServiceMonitorSettings,
    scriptContent: string
  ) {
    // TODO same as above, create a generator
    const payload = {
      type: "browser",
      locations: monitorSettings.locations,
      enabled: true,
      schedule: { number: "3", unit: "m" },
      "service.name": "",
      tags: [],
      timeout: null,
      name: "Test",
      namespace: "default",
      __ui: {
        script_source: { is_generated_script: false, file_name: "" },
        is_zip_url_tls_enabled: false,
        is_tls_enabled: false,
      },
      "source.zip_url.url": "",
      "source.zip_url.username": "",
      "source.zip_url.password": "",
      "source.zip_url.folder": "",
      "source.zip_url.proxy_url": "",
      "source.inline.script": scriptContent,
      params: "",
      screenshots: "on",
      synthetics_args: [],
      "filter_journeys.match": "",
      "filter_journeys.tags": [],
      ignore_https_errors: false,
      "throttling.is_enabled": true,
      "throttling.download_speed": "5",
      "throttling.upload_speed": "3",
      "throttling.latency": "20",
      "throttling.config": "5d/3u/20l",
    };

    const uuid = uuidv4();

    await axios.post(
      `${baseUrl}/internal/uptime/service/monitors/run_once/${uuid}`,
      payload,
      {
        headers: {
          "kbn-xsrf": "xxx",
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );

    return { uuid };
  }

  static async fetchRunOnceResults(
    baseUrl: string,
    apiKey: string,
    monitorId: string
  ) {
    const payload = {
      batch: [
        {
          request: {
            params: {
              index: "heartbeat-8*,heartbeat-7*,synthetics-*",
              body: {
                sort: [{ "@timestamp": "desc" }],
                query: {
                  bool: {
                    filter: [
                      {
                        term: {
                          config_id: monitorId,
                        },
                      },
                      {
                        terms: {
                          "synthetics.type": [
                            "heartbeat/summary",
                            "journey/start",
                          ],
                        },
                      },
                    ],
                  },
                },
              },
              size: 10,
            },
          },
          options: { strategy: "ese" },
        },
      ],
    };

    const responseValue: KibanaResponse<RunOnceResults> = await axios.post(
      `${baseUrl}/internal/bsearch`,
      payload,
      {
        headers: {
          "kbn-xsrf": "xxx",
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );

    return responseValue.data.result.rawResponse.hits;
  }
}
