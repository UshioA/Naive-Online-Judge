import {
  Typography,
  Layout,
  Form,
  Row,
  Button,
  Alert,
  Divider,
  Col,
  Skeleton,
  Input,
} from "antd";
import { React, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import {
  UserOutlined,
  CloseOutlined,
  NotificationOutlined,
  GitlabOutlined,
} from "@ant-design/icons";
import qs from "qs";
import moment from "moment";
import config from "../config";
import Time from "../components/misc/time";
import btoa from "../utils/mbtoa";

const AuthLayout = () => {
  const auth = useSelector((state) => state.auth.value);
  const history = useHistory();
  const location = useLocation();
  const [islogin, setIslogin] = useState(true);
  const [dbg, setDbg] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const error = qs.parse(location.search, { ignoreQueryPrefix: true }).error;
    if (!!error) {
      setError(error);
    }
  }, [location.search]);

  useEffect(() => {
    if (!auth) return;
    const now = moment();
    const exp = moment(auth.exp);
    if (now.isBefore(exp)) {
      const params = qs.parse(location.search, { ignoreQueryPrefix: true });
      history.push({
        pathname: params.redirect ?? "/",
        search: params.error ? `?error=${params.error}` : null,
      });
    }
  }, [auth, history, location.search]);

  const onFinish = (values) => {
    setDisabled(true);
    const redirect =
      qs.parse(location.search, { ignoreQueryPrefix: true }).redirect ?? "/";
    const callback = `/auth/gitlab/${islogin ? "login" : "register"}/callback`;
    const fullname = islogin ? "" : values.fullname;
    const dbgcode = dbg ? values.dbg : 0;

    const state = `oauth-${btoa(callback)}-${btoa(redirect)}-${btoa(
      fullname,
    )}-${btoa(dbgcode)}`;

    window.location.href = `${config.baseNames.api}/auth/gitlab/login?state=${state}`;
  };

  return (
    <Layout
      style={{
        paddingTop: "8vh",
        paddingBottom: "8vh",
        paddingLeft: "8vw",
        paddingRight: "8vw",
      }}
    >
      <Typography.Title
        level={1}
        onClick={() => {
          setDbg(!dbg);
        }}
      >
        Naive Online Judge
      </Typography.Title>
      <Typography.Text>
        当前服务器时间：
        <Time />
      </Typography.Text>
      <Divider />
      <Row gutter={24}>
        <Col xs={24} md={16}>
          <Typography.Title level={2}>
            <UserOutlined /> {`用户${islogin ? "登录" : "注册"}`}
          </Typography.Title>
          <Form
            name="login"
            initialValues={{ dbg: 0, fullname: "" }}
            onFinish={onFinish}
            autoComplete="off"
            style={{
              maxWidth: "27em",
              marginTop: "2em",
              marginBottom: "2em",
              padding: "1em",
              border: "1px solid #1890ff",
              borderRadius: "10px",
            }}
            disabled={disabled}
          >
            <Form.Item>
              {!error ? (
                <Alert message="请登录以提交代码或查看成绩。" />
              ) : (
                <Alert
                  message={error}
                  type={"error"}
                  action={
                    <Button
                      type="text"
                      size="small"
                      style={{ padding: "0" }}
                      onClick={() => setError(null)}
                    >
                      <CloseOutlined />
                    </Button>
                  }
                />
              )}
            </Form.Item>
            {islogin ? (
              <></>
            ) : (
              <>
                <Form.Item
                  label="用户名"
                  name="fullname"
                  rules={[
                    {
                      required: true,
                      massage: "用户名为空",
                    },
                  ]}
                >
                  <Input placeholder="请输入用户名" name="fullname"></Input>
                </Form.Item>
              </>
            )}
            {!dbg ? (
              <></>
            ) : (
              <Form.Item name="dbg">
                <Input />
              </Form.Item>
            )}
            <Form.Item style={{ marginBottom: "0.5em" }}>
              <Button
                type="default"
                htmlType="submit"
                size="large"
                style={{ width: "100%", border: "1px solid #1890ff" }}
              >
                <GitlabOutlined />{" "}
                {islogin
                  ? "使用南京大学代码托管服务登录"
                  : "使用南京大学代码托管服务注册"}
              </Button>
            </Form.Item>
            <Form.Item>
              <Button
                style={{ float: "right" }}
                type="text"
                onClick={() => {
                  setIslogin(!islogin);
                }}
              >
                <Typography.Text style={{ color: "#1890ff" }}>
                  {islogin ? "注册" : "登陆"}
                </Typography.Text>
              </Button>
            </Form.Item>
          </Form>
        </Col>
        <Col xs={24} md={8}>
          <Typography.Title level={2}>
            <NotificationOutlined /> 新闻
          </Typography.Title>
          <Skeleton active></Skeleton>
        </Col>
      </Row>
    </Layout>
  );
};

export default AuthLayout;
