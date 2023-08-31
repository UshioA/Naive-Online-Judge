import React from "react";
import { Link, useHistory } from "react-router-dom";

import { Menu as AntMenu, Divider } from "antd";
import {
  EditOutlined,
  UserSwitchOutlined,
  BookOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import Role from "../utils/role";

const Menu = () => {
  const history = useHistory();
  const auth = useSelector((state) => state.auth.value);

  return (
    <AntMenu
      mode="inline"
      style={{ height: "100%", paddingTop: "1.5em" }}
      defaultSelectedKeys={[history.location.pathname]}
      selectedKeys={[history.location.pathname]}
    >
      <AntMenu.ItemGroup key="g1" title="系统导航">
        <AntMenu.Item key="/" icon={<EditOutlined />}>
          <Link to="/">作业列表</Link>
        </AntMenu.Item>
        <AntMenu.Item key="/user/config" icon={<UserSwitchOutlined />}>
          <Link to="/user/config">用户设置</Link>
        </AntMenu.Item>
      </AntMenu.ItemGroup>

      {Role.isLower(auth.user.role, Role.Staff) ? (
        <></>
      ) : (
        <>
          <Divider />
          <AntMenu.ItemGroup key="g2" title="系统管理">
            <AntMenu.Item key="/admin/umanage" icon={<UserSwitchOutlined />}>
              <Link to="/admin/umanage">用户管理</Link>
            </AntMenu.Item>
            <AntMenu.Item key="/admin/assignment" icon={<BookOutlined />}>
              <Link to="/admin/assignment">作业管理</Link>
            </AntMenu.Item>
            <AntMenu.Item key="/admin/submissions" icon={<DatabaseOutlined />}>
              <Link to="/admin/submissions">提交管理</Link>
            </AntMenu.Item>
            <AntMenu.Item key="/admin/gts" icon={<DashboardOutlined />}>
              <Link to="/admin/gts">模板管理</Link>
            </AntMenu.Item>
            <AntMenu.Item key="/admin/stats" icon={<BarChartOutlined />}>
              <Link to="/admin/stats">数据管理</Link>
            </AntMenu.Item>
          </AntMenu.ItemGroup>
        </>
      )}
    </AntMenu>
  );
};

export default Menu;
