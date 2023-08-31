import {
  Col,
  Layout,
  List,
  Pagination,
  Row,
  Skeleton,
  Space,
  Spin,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  Link,
  useHistory,
  useLocation,
  useParams,
} from "react-router-dom/cjs/react-router-dom.min";
import { TagsOutlined, UploadOutlined } from "@ant-design/icons";
import http from "../../utils/http";
import qs from "qs";
import { ProblemMaxScore } from "../admin/problems/stats";

const ProbList = () => {
  const { aslug } = useParams();
  const [page, setPage] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const history = useHistory();
  const location = useLocation();
  const perPage = 10;

  useEffect(() => {
    const page =
      qs.parse(location.search, { ignoreQueryPrefix: true }).page ?? 1;
    http()
      .get(
        `/problems/all?assignment=${aslug}&start=${
          (page - 1) * perPage
        }&limit=${perPage}`,
      )
      .then((res) => {
        const probs = res.data.problems;
        setPage({
          ...res.data,
          problems: probs,
          number: page - 1,
          size: perPage,
        });
      })
      .catch((err) => console.error(err));
  }, [aslug, location.search]);

  useEffect(() => {
    http()
      .get(`/assignments?slug=${aslug}`)
      .then((res) => {
        setAssignment(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [aslug]);

  return (
    <Layout>
      {assignment ? (
        <Typography.Title level={3}>{assignment.title}</Typography.Title>
      ) : (
        <Skeleton active />
      )}
      <Spin spinning={!page || !assignment}>
        <List
          header={
            <Typography.Title level={4}>
              <TagsOutlined /> 问题列表
            </Typography.Title>
          }
          dataSource={page ? page.problems : []}
          bordered
          pagination={false}
          renderItem={(item) => {
            return (
              <List.Item
                actions={[
                  <Link
                    to={`/assignment/${item.assignment}/problems/${item.slug}`}
                  >
                    查看
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  title={<Typography.Text strong>{item.title}</Typography.Text>}
                  description={
                    <Space style={{ float: "left" }}>
                      <Row gutter={24}>
                        <Col>
                          <UploadOutlined />{" "}
                          {`${item.assignment}-${item.slug} format: (${item.submitFileType}) size: (${item.submitFileSize} MiB)`}
                        </Col>
                        <Col>{`满分: ${item.totalScore}`}</Col>
                        <Col>
                          最高分:{" "}
                          <ProblemMaxScore
                            assignment={item.assignment}
                            problem={item.slug}
                          />
                        </Col>
                      </Row>
                    </Space>
                  }
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

export default ProbList;
