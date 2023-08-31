import React, { useEffect, useState } from "react";
import { Button, message } from "antd";
import { Layout, Skeleton, Typography, Form } from "antd";
import { UserOutlined, ReloadOutlined } from "@ant-design/icons";
import http from "../../utils/http";
import UserConfig from "../config";
import { useDispatch, useSelector } from "react-redux";
import { set } from "../../store/auth";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

const Config = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const history = useHistory();
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [disabled, setDisabled] = useState(false);
  const auth = useSelector((state) => state.auth.value);

  const onFinish = (values) => {
    setDisabled(true);
    var usr = { ...user };
    usr.email = values.email;
    usr.fullname = values.fullname;
    http()
      .put("/users", usr)
      .then((res) => {
        if (res.status === 200) {
          message.success("修改成功");
          setUser(usr);
          dispatch(
            set({
              ...auth,
              user: { ...usr },
            }),
          );
          history.push("/");
        } else {
          message.error("修改失败");
          setDisabled(false);
        }
      })
      .catch((err) => {
        console.log(err);
        message.error("修改失败");
        setDisabled(false);
      });
  };

  const onReset = () => {
    setDisabled(true);
    form.resetFields();
    history.goBack();
    setDisabled(false);
  };

  const getUsr = () => {
    http()
      .get("/users", {})
      .then((res) => {
        if (res.status === 200) {
          setUser(res.data);
        } else {
          // TODO
          message.error("获取用户信息失败");
        }
      })
      .catch((err) => {
        console.log(err);
        message.error("无法连接至服务器");
        setError("无法连接到服务器");
      });
  };

  useEffect(() => {
    if (error === null) {
      getUsr();
    }
  }, [error]);

  return (
    <Layout>
      <Typography.Title level={2}>
        <UserOutlined /> 用户设置
      </Typography.Title>
      {!user ? (
        <div>
          <Skeleton paragraph={3} active={error ? false : true} />
          {error ? (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              shape="round"
              onClick={() => {
                setError(null);
              }}
            >
              重新加载
            </Button>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <UserConfig
          self={user}
          user={user}
          form={form}
          onFinish={onFinish}
          onReset={onReset}
          disabled={disabled}
          labelCol={{ span: 2 }}
          wrapperCol={{ span: 8 }}
        />
      )}
    </Layout>
  );
};

export default Config;
