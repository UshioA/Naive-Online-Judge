import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Switch } from "react-router-dom";

import { Provider } from "react-redux";
import store from "./store";

import "./index.less";
import { ConfigProvider, Layout } from "antd";
import zhCN from "antd/lib/locale/zh_CN";

import MainLayout from "./layouts/main";
import AuthLayout from "./layouts/auth";

console.info(
  `Welcome to Naive Online Judge!\n` +
    `To access API directly, call \`http()\` in console.\n` +
    `E.g. \`http().get("/assignments/all")\` fetches all assignments.`,
);

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider locale={zhCN}>
        <withRouter>
          <HashRouter>
            <Layout style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
              <Switch>
                <Route path="/auth/login" children={<AuthLayout />} />
                <Route path="/" children={<MainLayout />} />
              </Switch>
            </Layout>
          </HashRouter>
        </withRouter>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>,
);
