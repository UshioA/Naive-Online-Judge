import React, { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import moment from "moment";
import "moment/locale/zh-cn";
import qs from "qs";
import http from "../../utils/http";

import { Layout, List, Pagination, Space, Spin, Tabs, Typography } from "antd";
import { TagsOutlined, SmileOutlined, FrownOutlined } from "@ant-design/icons";

const AssignmentList = () => {
  const [page, setPage] = useState(null);
  const history = useHistory();
  const location = useLocation();
  const [key, setKey] = useState("on");
  const perPage = 10;

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
  }, [location.search, key]);

  return (
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
          setPage(null);
          history.push({
            pathname: location.pathname,
          }); //to reset page number, avoiding confusing results.
        }}
      />
      <Spin spinning={!page}>
        <List
          header={
            <Typography.Title level={3}>
              <TagsOutlined /> 作业列表
            </Typography.Title>
          }
          dataSource={page ? page.assignments : []}
          bordered
          pagination={false}
          renderItem={(item) => {
            return (
              <List.Item
                actions={[
                  <Link to={`/assignment/${item.slug}/problems`}>查看</Link>,
                ]}
              >
                <List.Item.Meta
                  title={<Typography.Text strong>{item.title}</Typography.Text>}
                  description={((time) => {
                    const ddl = moment(time).locale("zh_cn");
                    return (
                      <Typography.Text
                        delete={item.ended}
                        type={item.ended ? "secondary" : ""}
                      >
                        {ddl.format("YYYY-MM-DD HH:mm")}
                        {!item.ended && <>（{ddl.fromNow()}）</>}
                      </Typography.Text>
                    );
                  })(item.endTime)}
                />
              </List.Item>
            );
          }}
        />
        <Space style={{ float: "right", marginTop: "1em" }}>
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
  );
};

export default AssignmentList;
