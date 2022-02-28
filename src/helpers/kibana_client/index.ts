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

type KibanaResponse<T> = {
  data: T;
};

type FleetPolicy = {
  items: Array<{ id: string }>;
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
};

export class KibanaClient {
  static async getMonitors(apiKey: string) {
    const {
      data: { items: policies },
    }: KibanaResponse<FleetPolicy> = await axios.get(
      "http://localhost:5601/api/fleet/agent_policies?perPage=100",
      {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      }
    );

    const installFetches = policies.map(
      async ({ id: policyId }: { id: string }) => {
        const {
          data: {
            item: { package_policies: packageInstallations },
          },
        }: KibanaResponse<PackageInstallations> = await axios.get(
          `http://localhost:5601/api/fleet/agent_policies/${policyId}`,
          {
            headers: {
              Authorization: `ApiKey ${apiKey}`,
            },
          }
        );

        return packageInstallations.filter(packageInstallation => {
          return packageInstallation.package.name === "synthetics";
        });
      }
    );

    return (await Promise.all(installFetches)).flatMap(x => x);
  }
}
