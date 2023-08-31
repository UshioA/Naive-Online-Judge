import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { Typography } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import http from "../../../utils/http";
import btoa from "../../../utils/mbtoa";
const cached = {};

const AdminUserInfo = ({ userId }) => {
  const history = useHistory();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (cached[userId]) {
      setUser(cached[userId]);
    } else {
      http()
        .get(`/users?username=${userId}`)
        .then((res) => {
          setUser(res.data);
          cached[userId] = res.data;
        })
        .catch((err) => {
          console.error(err);
          if (err.response.status === 404) {
            setUser({ username: null });
          }
        });
    }
  }, [userId]);

  return (
    <>
      <Typography.Link
        type={user && user.username === null ? "danger" : "primary"}
        onClick={() => history.push(`/admin/umanage/${btoa(user.username)}`)}
      >
        {!user ? (
          <>
            <code>{userId}</code>
            <LoadingOutlined />
          </>
        ) : (
          <>
            {user.username ? `${user.username} ${user.fullname}` : "用户不存在"}
          </>
        )}
      </Typography.Link>
    </>
  );
};

export default AdminUserInfo;
