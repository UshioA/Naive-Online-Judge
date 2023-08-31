import { useEffect, useState } from "react";
import atob from "../../../utils/matob";
import { Skeleton, Typography, message } from "antd";
import UserConfig from "../../config";
import http from "../../../utils/http";
import { useSelector } from "react-redux";
import {
  useHistory,
  useParams,
} from "react-router-dom/cjs/react-router-dom.min";
import { useForm } from "antd/es/form/Form";
import Role from "../../../utils/role";

const UserEdit = () => {
  const { username } = useParams();
  const auth = useSelector((state) => state.auth.value);
  const history = useHistory();
  const [form] = useForm();
  const [user, setUser] = useState(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const uname = atob(username);
    http()
      .get(`/users?username=${uname}`)
      .then((res) => {
        if (res.status === 200) {
          setUser({
            email: res.data.email,
            fullname: res.data.fullname,
            gitlabid: res.data.gitlabid,
            gongde: res.data.gongde,
            id: res.data.id,
            lastgd: res.data.lastgd,
            role: res.data.role,
            username: res.data.username,
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, [username]);

  const onReset = () => {
    setDisabled(true);
    form.resetFields();
    history.goBack();
    setDisabled(false);
  };

  const onFinish = (values) => {
    setDisabled(true);
    const dst = buildNewUser(auth.user, user, values);
    if (!dst) {
      message.error("修改用户失败!");
    } else {
      http()
        .put("/users", dst)
        .then((res) => {
          if (res.status === 200) {
            message.success("修改成功");
            history.push("/admin/umanage");
          } else {
            message.error("修改失败");
            setDisabled(false);
          }
        })
        .catch((err) => {
          message.error("发生错误!");
          console.log(err);
          setDisabled(false);
        });
    }
  };

  const buildNewUser = (writer, origin, src) => {
    var dst = {
      ...origin,
    };
    switch (writer.role) {
      case Role.Admin: {
        if (src.role !== 0 && dst.role !== 0) {
          dst.role = src.role;
        }
      }
      case Role.Staff:
      case Role.Student:
        {
          if (src.fullname !== "") {
            dst.fullname = src.fullname;
          }
          if (src.email !== "") {
            dst.email = src.email;
          }
        }
        break;
      default: {
        message.error("无效的角色!");
      }
    }
    return dst;
  };

  return (
    <>
      <Typography.Title level={2}>编辑用户</Typography.Title>
      {!user ? (
        <Skeleton active />
      ) : (
        <UserConfig
          self={auth.user}
          user={user}
          form={form}
          onFinish={onFinish}
          onReset={onReset}
          disabled={disabled}
        />
      )}
    </>
  );
};

export default UserEdit;
