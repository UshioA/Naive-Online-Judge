import {
  Button,
  Col,
  Empty,
  Layout,
  List,
  Pagination,
  Popconfirm,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  Link,
  useHistory,
  useLocation,
  useParams,
} from "react-router-dom/cjs/react-router-dom.min";
import { UploadOutlined, FileAddOutlined } from "@ant-design/icons";
import qs from "qs";
import { useSelector } from "react-redux";
import TODO from "../../misc/todo";
import http from "../../../utils/http";
import Role from "../../../utils/role";

const AdminProbList = () => {
  const { aslug } = useParams();
  const [page, setPage] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const history = useHistory();
  const location = useLocation();
  const auth = useSelector((state) => state.auth.value);
  const [re, setRe] = useState(false);
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
  }, [aslug, location.search, re]);

  const delProb = (aslug, bslug) => {
    http()
      .delete(`/problems?assignment=${aslug}&slug=${bslug}`)
      .then((res) => {
        message.success("已删除问题");
        setRe(!re);
      })
      .catch((err) => {
        message.error(`未能删除问题`);
        console.log(err);
      });
  };

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

  return Role.isLower(Role.Student, auth.user.role) ? (
    <Layout>
      <Spin spinning={!page || !assignment}>
        <List
          header={
            assignment ? (
              <Typography.Text strong>{assignment.title}</Typography.Text>
            ) : (
              aslug
            )
          }
          dataSource={page ? page.problems : []}
          bordered
          pagination={false}
          renderItem={(item) => {
            return (
              <List.Item
                actions={[
                  <Link
                    to={`/admin/problem/${item.assignment}/${item.slug}/choose_grader`}
                  >
                    grader
                  </Link>,
                  <Link to={`/admin/problem/${item.assignment}/${item.slug}`}>
                    编辑问题
                  </Link>,
                  <Link
                    to={`/admin/problem/${item.assignment}/${item.slug}/submissions`}
                  >
                    查看提交
                  </Link>,
                  <Popconfirm
                    onConfirm={() => {
                      delProb(assignment.slug, item.slug);
                    }}
                    description={`确定删除这个问题吗`}
                    title={`删除问题`}
                  >
                    <Button size="small" type="link" danger>
                      删除问题
                    </Button>
                  </Popconfirm>,
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
                      </Row>
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
        <Space style={{ float: "right", marginTop: "1em" }}>
          <Button
            type="primary"
            onClick={() => {
              history.push(`/admin/assignment/${assignment.slug}/problems/add`);
            }}
          >
            <FileAddOutlined />
            添加问题
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

export default AdminProbList;
