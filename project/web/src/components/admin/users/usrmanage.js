import React, { useEffect, useState } from "react";
import {
  Table,
  Layout,
  Typography,
  Tag,
  message,
  Popconfirm,
  Button,
  Empty,
  Spin,
  Space,
} from "antd";
import { UserOutlined, UserAddOutlined } from "@ant-design/icons";
import ColumnGroup from "antd/es/table/ColumnGroup";
import http from "../../../utils/http";
import btoa from "../../../utils/mbtoa";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import Role, { canWriteUser } from "../../../utils/role";

const UsrManage = () => {
  const auth = useSelector((state) => state.auth.value);
  const [loading, setLoading] = useState(true);
  const [userlist, setUserList] = useState(null);

  useEffect(() => {
    http()
      .get("/users/all", {})
      .then((res) => {
        if (res.status === 200) {
          setUserList([...res.data.users]);
          setLoading(false);
        } else {
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const delUser = (username) => {
    setLoading(true);
    http()
      .delete(`/users?username=${username}`)
      .then((res) => {
        if (res.status === 200) {
          setUserList(userlist.filter((u) => u.username !== username));
          message.success("已删除用户");
          setLoading(false);
        }
      })
      .catch((err) => {
        message.error("删除用户失败");
        console.log(err);
        setLoading(false);
      });
  };

  return auth.user.role < Role.Student ? (
    <Layout>
      <Typography.Title level={2}>
        <UserOutlined /> 用户管理
        <Space style={{ float: "right" }}>
          <Link to="/admin/umanage/usrcreate">
            <Button>
              <UserAddOutlined /> 添加用户
            </Button>
          </Link>
        </Space>
      </Typography.Title>
      <Spin spinning={loading} delay={100}>
        <Table dataSource={userlist}>
          <ColumnGroup
            title={"学号"}
            dataIndex={"username"}
            sorter={(a, b) => a.username.localeCompare(b.username)}
          ></ColumnGroup>
          <ColumnGroup title={"姓名"} dataIndex={"fullname"}></ColumnGroup>
          <ColumnGroup
            title={"角色"}
            dataIndex={"role"}
            render={(role) => {
              return 0 <= role && role <= 2 ? (
                <Tag>{["管理", "助教", "学生"][role]}</Tag>
              ) : (
                <Tag>无效</Tag>
              );
            }}
          ></ColumnGroup>
          <ColumnGroup
            title={"UID"}
            dataIndex={"gitlabid"}
            sorter={(a, b) => a.gitlabid - b.gitlabid}
          ></ColumnGroup>
          <ColumnGroup
            title={"功德"}
            dataIndex={"gongde"}
            sorter={(a, b) => a.gongde - b.gongde}
          ></ColumnGroup>
          <ColumnGroup
            title={"操作"}
            dataIndex={"username"}
            render={(username) => {
              const cantDelete =
                auth.user.username === username ||
                !canWriteUser(
                  auth.user,
                  userlist.find((u) => u.username === username),
                );

              return (
                <>
                  <Button type="link">
                    <Link to={`/admin/umanage/${btoa(username)}`}>编辑</Link>
                  </Button>
                  <Popconfirm
                    title="二次确认"
                    description={`真的要删除 ${username} 吗？`}
                    onConfirm={() => {
                      setTimeout(() => delUser(username), 114);
                    }}
                    //! this line is shit, just for not showing next username during closing animation.
                    //! cant figure out how this popover could be designed to not capable of carrying variables.
                    disabled={cantDelete}
                  >
                    <Button type="link" disabled={cantDelete}>
                      <Typography.Text
                        type={cantDelete ? "secondary" : "danger"}
                      >
                        删除
                      </Typography.Text>
                    </Button>
                  </Popconfirm>
                </>
              );
            }}
          ></ColumnGroup>
        </Table>
      </Spin>
    </Layout>
  ) : (
    <Empty />
  );
};

export default UsrManage;
