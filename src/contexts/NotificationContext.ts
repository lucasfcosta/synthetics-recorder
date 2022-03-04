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

import { Toast } from "@elastic/eui/src/components/toast/global_toast_list";
import React from "react";
import { Setter } from "../common/types";

interface INotificationContext {
  toasts?: Toast[];
  pushFailureToast: (title: string, text: string) => void;
  pushSuccessToast: (title: string, text: string) => void;
  setToastLifetime: Setter<number>;
  toastLifetime: number;
}

export const NotificationContext = React.createContext<INotificationContext>({
  pushFailureToast: () => {
    throw Error("Not implemented");
  },
  pushSuccessToast: () => {
    throw Error("Not implemented");
  },
  setToastLifetime: () => {
    throw Error("Not implemented");
  },
  toastLifetime: 6000,
});
