import { React, useState } from "react";
import { useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Layout,
  Tooltip,
  Typography,
  Skeleton,
  Space,
  Row,
  Col,
  message,
  Dropdown,
  Drawer,
} from "antd";
import {
  LogoutOutlined,
  BarChartOutlined,
  TrophyOutlined,
  MenuOutlined,
  SettingOutlined,
  ToolOutlined,
  BookOutlined,
  DatabaseOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import Time from "./misc/time";
import { clear, set } from "../store/auth";
import Version from "./misc/version";
import http from "../utils/http";
import Role, { canWriteUser } from "../utils/role";
import LeaderBoard from "./misc/leaderboard";
import GravatarRound from "./misc/gravatar";

const Header = () => {
  const auth = useSelector((state) => state.auth.value);
  const dispatch = useDispatch();
  const history = useHistory();
  const [open, setOpen] = useState(false);
  const [debug, setDebug] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  const items = [
    {
      label: "个人设置",
      key: "config",
      icon: <SettingOutlined />,
    },
    {
      label: "排行榜",
      key: "leader_board",
      icon: <TrophyOutlined />,
    },
    {
      label: "登出",
      key: "logout",
      icon: <LogoutOutlined />,
    },
  ];

  const adminItems = [
    {
      label: "用户管理",
      key: "usr_manage",
      icon: <ToolOutlined />,
    },
    {
      label: "作业管理",
      key: "ass_manage",
      icon: <BookOutlined />,
    },
    {
      label: "提交管理",
      key: "sub_manage",
      icon: <DatabaseOutlined />,
    },
    {
      label: "模板管理",
      key: "temp_manage",
      icon: <DashboardOutlined />,
    },
    {
      label: "数据管理",
      key: "stat_manage",
      icon: <BarChartOutlined />,
    },
  ];

  const logout = () => {
    dispatch(clear());
    history.replace("/auth/login");
  };

  const gongde = () => {
    const user = auth.user;
    http()
      .get("/users/gongde", {
        user: user,
      })
      .then((res) => {
        if (res.status === 200) {
          const nuser = res.data;
          message.success(`获得 ${nuser.gongde - user.gongde} 点功德!`);
          dispatch(
            set({
              ...auth,
              user: { ...nuser },
            }),
          );
        }
      })
      .catch((err) => {
        if (err.code === "ERR_BAD_REQUEST") {
          message.error("今日已获得功德🙏");
        } else {
          message.error("我们这边出了错");
          console.log(err);
        }
      });
  };

  return (
    <Layout.Header
      className="header"
      style={{
        zIndex: 1000,
        background: 0xffffff,
        boxShadow: "0 2px 8px rgba(0,0,0,.15)",
      }}
    >
      <Space style={{ float: "left" }}>
        <Tooltip
          title={
            <>
              <Version />
              <Space>
                服务器时间：
                <Time />
              </Space>
            </>
          }
        >
          <Typography.Text strong onClick={() => setDebug(!debug)}>
            Naive Online Judge
          </Typography.Text>
        </Tooltip>
      </Space>
      <Space style={{ float: "right" }}>
        <Row gutter={12}>
          <Col>
            {!auth ? (
              <Skeleton paragraph={1}></Skeleton>
            ) : (
              <>
                {" "}
                {auth.user.username} {auth.user.fullname}
              </>
            )}
          </Col>
          <Col>
            {!auth ? (
              <></>
            ) : (
              <div
                style={{
                  marginTop: "1em",
                  cursor: "pointer",
                  height: "35px",
                  width: "35px",
                }}
                onClick={gongde}
              >
                <GravatarRound
                  debug={debug}
                  email={auth.user.email}
                  fullName={auth.user.fullname}
                />
              </div>
            )}
          </Col>
          <Col>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: canWriteUser(auth.user, {
                  username: "",
                  role: Role.Student,
                })
                  ? [...adminItems, ...items]
                  : items,
                onClick: ({ key }) => {
                  switch (key) {
                    case "logout":
                      logout();
                      break;
                    case "config":
                      history.push("/user/config");
                      break;
                    case "leader_board":
                      showDrawer();
                      break;
                    case "usr_manage":
                      history.push("/admin/umanage");
                      break;
                    case "ass_manage":
                      history.push("/admin/assignment");
                      break;
                    case "sub_manage":
                      history.push("/admin/submissions");
                      break;
                    case "temp_manage":
                      history.push("/admin/gts");
                      break;
                    case "stat_manage":
                      history.push("/admin/stats");
                      break;
                    default:
                      message.error("不合法的点击项");
                  }
                },
              }}
            >
              <Button size="small" type="ghost">
                <MenuOutlined />
              </Button>
            </Dropdown>
          </Col>
        </Row>
      </Space>
      <Drawer onClose={onClose} open={open}>
        <LeaderBoard />
      </Drawer>
    </Layout.Header>
  );
};

export default Header;
