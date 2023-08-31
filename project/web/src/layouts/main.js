import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Route, Redirect, Switch, useLocation } from "react-router-dom";
import qs from "qs";
import http from "../utils/http";
import config from "../config";
import { set } from "../store/auth";
import { Layout, Skeleton, Typography } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import Header from "../components/header";
import Menu from "../components/menu";
import AssignmentList from "../components/assignments/list";
import Config from "../components/user/userconfig";
import UsrManage from "../components/admin/users/usrmanage";
import atob from "../utils/matob";
import UserEdit from "../components/admin/users/useredit";
import UsrCreate from "../components/admin/users/usrcreate";
import ProbList from "../components/problems/list";
import ProbView from "../components/problems/view";
import AdminAssList from "../components/admin/assignments/list";
import AdminProbList from "../components/admin/problems/list";
import ProbEdit from "../components/admin/problems/edit";
import AssignEdit from "../components/admin/assignments/edit";
import ProbAdd from "../components/admin/problems/padd";
import AssignAdd from "../components/admin/assignments/add";
import AdminSubmissionList from "../components/admin/submissions/list";
import {
  AdminViewSubmit,
  AdminViewSubmit3,
} from "../components/admin/problems/view_submit";
import AdminGtMaker from "../components/admin/gt/make_gt";
import AdminGtList from "../components/admin/gt/list";
import AdminGtEditor from "../components/admin/gt/edit";
import AdminGraderChooser from "../components/admin/problems/grader_chooser";
import AdminStats from "../components/misc/stats";

const MainLayout = () => {
  const auth = useSelector((state) => state.auth.value);
  const dispatch = useDispatch();
  const location = useLocation();
  const [holdOn, setHoldOn] = useState(true);

  // Check for oauth callback. If is callback, fetch access token and set to redux.
  useEffect(() => {
    const params = qs.parse(window.location.search, {
      ignoreQueryPrefix: true,
    });
    if (!params.state || !params.state.startsWith("oauth") || !params.code) {
      setHoldOn(false);
    } else {
      const parts = params.state.split("-");
      if (parts.length !== 5) {
        window.alert(`无效的状态参数！\n${params.state}`);
        window.location.href = config.baseNames.web;
      } else {
        const url = atob(parts[1]);
        const redirect = atob(parts[2]);
        const fullname = atob(parts[3]);
        const dbgcode = Number(atob(parts[4]));
        http()
          .post(url, {
            code: params.code,
            state: params.state,
            platform: `web-${config.version}`,
            fullname: fullname,
            dbgcode: dbgcode,
          })
          .then((res) => {
            if (res.status === 200) {
              dispatch(set(res.data));
              window.location.href = `${config.baseNames.web}#`;
            }
          })
          .catch((err) => {
            console.error(err);
            window.location.href =
              `${config.baseNames.web}#/auth/login?redirect=${redirect}` +
              `&error=${err.response.data.message}`;
          });
      }
    }
  }, [dispatch]);
  return (
    <Route
      render={() =>
        holdOn ? (
          <Layout
            style={{
              paddingTop: "10vh",
              paddingBottom: "10vh",
              paddingLeft: "10vw",
              paddingRight: "10vw",
            }}
          >
            <Typography.Title level={2}>
              <LoadingOutlined /> 正在处理……
            </Typography.Title>
          </Layout>
        ) : (
          <>
            {!auth ? (
              <Redirect
                to={{
                  pathname: "/auth/login",
                  search: `?redirect=${location.pathname}`,
                }}
              />
            ) : (
              <Layout style={{ height: "100vh" }}>
                <Header />
                <Layout>
                  <Layout.Sider width="15em" breakpoint="lg" collapsedWidth="0">
                    <Menu />
                  </Layout.Sider>
                  <Layout>
                    <Layout.Content
                      style={{
                        padding: "5em",
                        overflowY: "scroll",
                        overflowX: "auto",
                      }}
                    >
                      <Switch>
                        <Route path="/" exact children={<AssignmentList />} />
                        <Route
                          path="/assignment/:aslug/problems"
                          exact
                          children={<ProbList />}
                        />
                        <Route
                          path="/assignment/:aslug/problems/:bslug"
                          exact
                          children={<ProbView />}
                        />
                        <Route
                          path="/user/config"
                          exact
                          children={<Config />}
                        ></Route>
                        <Route
                          path="/admin/umanage"
                          exact
                          children={<UsrManage />}
                        ></Route>
                        <Route
                          path="/admin/umanage/usrcreate"
                          exact
                          children={<UsrCreate />}
                        />
                        <Route
                          path="/admin/umanage/:username"
                          exact
                          children={<UserEdit />}
                        />
                        <Route
                          path="/admin/assignment"
                          exact
                          children={<AdminAssList />}
                        />
                        <Route
                          path="/admin/assignment/edit/:aslug"
                          exact
                          children={<AssignEdit />}
                        />
                        <Route
                          path="/admin/assignment/:aslug/problems"
                          exact
                          children={<AdminProbList />}
                        />
                        <Route
                          path="/admin/assignment/add"
                          exact
                          children={<AssignAdd />}
                        />
                        <Route
                          path="/admin/assignment/:aslug/problems/add"
                          exact
                          children={<ProbAdd />}
                        />
                        <Route
                          path="/admin/problem/:aslug/:bslug"
                          exact
                          children={<ProbEdit />}
                        />
                        <Route
                          path="/admin/problem/:aslug/:bslug/choose_grader"
                          exact
                          children={<AdminGraderChooser />}
                        />
                        <Route
                          path="/admin/problem/:aslug/:bslug/submissions/:username/:count"
                          exact
                          children={<AdminViewSubmit />}
                        />
                        <Route
                          path="/admin/problem/:aslug/:bslug/submissions"
                          exact
                          children={<AdminViewSubmit />}
                        />
                        <Route
                          path="/admin/submissions"
                          exact
                          children={<AdminSubmissionList />}
                        />
                        <Route
                          path="/admin/gts/make"
                          exact
                          children={<AdminGtMaker />}
                        />
                        <Route
                          path="/admin/gts/edit/:slug"
                          exact
                          children={<AdminGtEditor />}
                        />
                        <Route
                          path="/admin/gts"
                          exact
                          children={<AdminGtList />}
                        />
                        <Route
                          path="/admin/stats"
                          exact
                          children={<AdminStats />}
                        />
                      </Switch>
                    </Layout.Content>
                  </Layout>
                </Layout>
              </Layout>
            )}
          </>
        )
      }
    />
  );
};

export default MainLayout;
