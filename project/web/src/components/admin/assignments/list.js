import React, { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import moment from "moment";
import "moment/locale/zh-cn";
import qs from "qs";

import {
  Button,
  Empty,
  Layout,
  List,
  Pagination,
  Popconfirm,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from "antd";
import {
  SmileOutlined,
  FrownOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import http from "../../../utils/http";
import { useSelector } from "react-redux";
import Role from "../../../utils/role";

const AdminAssList = () => {
  const [page, setPage] = useState(null);
  const history = useHistory();
  const location = useLocation();
  const auth = useSelector((state) => state.auth.value);
  const [key, setKey] = useState("on");
  const [refetch, setRefetch] = useState(true);
  const perPage = 10;

  useEffect(() => {
    if (Role.isLower(auth.user.role, Role.Student)) {
      message.error("对不起, 您没有权限访问当前内容!");
    }
  }, [auth.user.role]);

  useEffect(() => {
    const page =
      qs.parse(location.search, { ignoreQueryPrefix: true }).page ?? 1;
    http()
      .get(`/assignments/${key}?start=${(page - 1) * perPage}&limit=${perPage}`)
      .then((res) => {
        const assignments = [];
        const now = moment();
        res.data.assignments.forEach((assignment) => {
          const ddl = moment(assignment.endTime);
          assignments.push({
            ...assignment,
            ended: now.isAfter(ddl),
          });
        });
        setPage({
          ...res.data,
          assignments: assignments,
          number: page - 1,
          size: perPage,
        });
      })
      .catch((err) => console.error(err));
  }, [location.search, key, refetch]);

  const delAssignment = (slug) => {
    http()
      .delete(`/assignments?slug=${slug}`)
      .then((res) => {
        if (res.status === 200) {
          message.success(`已删除代号为${slug}的作业`);
          setRefetch(!refetch); //stupid;
        }
      })
      .catch((err) => {
        message.error(`删除失败!`);
        console.log(err);
      });
  };

  return Role.isLower(Role.Student, auth.user.role) ? (
    <Layout>
      <Tabs //🤣
        hideAdd
        defaultActiveKey="on"
        activeKey={key}
        type="card"
        items={[
          {
            key: "on",
            label: (
              <span>
                <SmileOutlined />
                正在进行
              </span>
            ),
          },
          {
            key: "finish",
            label: (
              <span>
                <FrownOutlined />
                已结束
              </span>
            ),
          },
        ]}
        onChange={() => {
          if (key === "on") {
            setKey("finish");
          } else if (key === "finish") {
            setKey("on");
          } else {
            setKey("on");
          }
          history.push({
            pathname: location.pathname,
          }); //to reset page number, avoiding confusing results.
        }}
      />
      <Spin spinning={!page}>
        <List
          dataSource={page ? page.assignments : []}
          bordered
          pagination={false}
          renderItem={(item) => {
            return (
              <List.Item
                actions={[
                  <Link to={`/admin/assignment/${item.slug}/problems`}>
                    查看问题
                  </Link>,
                  <Link to={`/admin/assignment/edit/${item.slug}`}>
                    编辑作业
                  </Link>,
                  <Popconfirm
                    title={`删除作业`}
                    description={`你确定要删除这个作业吗?`}
                    onConfirm={() => delAssignment(item.slug)}
                  >
                    <Button type="link" size="small">
                      <Typography.Text type="danger">删除作业</Typography.Text>
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={<Typography.Text strong>{item.title}</Typography.Text>}
                  description={((beginTime, endTime) => {
                    const ldd = moment(beginTime).local("zh_cn");
                    const ddl = moment(endTime).locale("zh_cn");
                    return (
                      <Typography.Text>
                        {`${ldd.format("YYYY-MM-DD HH:mm")} - ${ddl.format(
                          "YYYY-MM-DD HH:mm",
                        )}`}
                      </Typography.Text>
                    );
                  })(item.beginTime, item.endTime)}
                />
              </List.Item>
            );
          }}
        />
        <Space style={{ float: "right", marginTop: "1em" }}>
          <Button
            type="primary"
            onClick={() => history.push("/admin/assignment/add")}
          >
            <FileAddOutlined /> 添加作业
          </Button>
          <Pagination
            current={page ? page.number + 1 : 1}
            pageSize={page ? page.size : perPage}
            total={page ? page.total : 0}
            onChange={(p) =>
              history.push({
                pathname: location.pathname,
                search: `?page=${p}`,
              })
            }
          />
        </Space>
      </Spin>
    </Layout>
  ) : (
    <Empty />
  );
};

export default AdminAssList;
