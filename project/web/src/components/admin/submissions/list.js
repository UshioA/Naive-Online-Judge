import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  useHistory,
  useLocation,
} from "react-router-dom/cjs/react-router-dom.min";
import { Link } from "react-router-dom";
import qs from "qs";
import http from "../../../utils/http";
import {
  Button,
  Col,
  Form,
  Pagination,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { DatabaseOutlined, EditOutlined } from "@ant-design/icons";
import ColumnGroup from "antd/es/table/ColumnGroup";
import AdminUserInfo from "../users/userinfo";
import AdminProbInfo from "../problems/probleminfo";
import moment from "moment";
import Download from "../../../utils/download";
import submitName from "../../../utils/submitName";
import AdminGraderInfo from "../gt/graderinfo";

const AdminSubmissionList = () => {
  const PAGE_SIZE = 10;

  const location = useLocation();
  const history = useHistory();
  const [queryUserId, setQueryUserId] = useState(null);
  const [queryAssignmentId, setQueryAssignmentId] = useState(null);
  const [queryProblemId, setQueryProblemId] = useState(null);
  const [queryGraded, setQueryGraded] = useState(null);
  // const [human, setHuman] = useState(false);
  // const [formList, setFormList] = useState(null);
  const [page, setPage] = useState(null);

  useEffect(() => {
    const page =
      qs.parse(location.search, { ignoreQueryPrefix: true }).page ?? 1;
    http()
      .get(`/submissions/all`, {
        params: {
          assignment: queryAssignmentId,
          problem: queryProblemId,
          start: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        },
      })
      .then((res) => {
        setPage({
          submissions: res.data.submissions.map((a) => {
            return { ...a, apslug: { aslug: a.assignment, pslug: a.problem } };
          }),
          total: res.data.total,
          page: +page,
        });
      })
      .catch((err) => console.error(err));
  }, [location, queryProblemId, queryUserId, queryAssignmentId, queryGraded]);

  return (
    <>
      <Typography.Title level={2}>
        <DatabaseOutlined /> 提交管理
      </Typography.Title>
      {/* <Form layout="inline">

    </Form> */}
      {!page ? (
        <Skeleton />
      ) : (
        <>
          <Table dataSource={page.submissions} pagination={false}>
            <ColumnGroup
              dataIndex={"id"}
              title={"id"}
              render={(a) => a.substr(-8)}
            />
            <ColumnGroup
              dataIndex={"username"}
              title={"用户名"}
              render={(a) => <AdminUserInfo userId={a} />}
            />
            <ColumnGroup
              dataIndex={"apslug"}
              title={"问题"}
              render={(a) => <AdminProbInfo apslug={a} />}
            />
            <ColumnGroup
              dataIndex={"time"}
              title={"提交时间"}
              render={(a) =>
                moment(a).locale("zh-cn").format("YYYY-MM-DD HH:mm:ss")
              }
            />
            <ColumnGroup
              dataIndex={"graded"}
              title={"状态"}
              render={(a) => {
                return <>{a ? <Tag>已评分</Tag> : <Tag>未评分</Tag>}</>;
              }}
            />
            <ColumnGroup
              title={"总得分"}
              render={(text, record) => (
                <AdminGraderInfo
                  assignment={record.assignment}
                  problem={record.problem}
                  result={record.result}
                />
              )}
            />
            <ColumnGroup
              title={"评分时间"}
              render={(text, record) =>
                record.graded
                  ? moment(record.result.time)
                      .locale("zh-cn")
                      .format("YYYY-MM-DD HH:mm:ss")
                  : null
              }
            />
            <ColumnGroup
              key={"actions"}
              title={"操作"}
              render={(text, record) => {
                return (
                  <>
                    <Download
                      link={`/submissions/download?assignment=${record.assignment}&problem=${record.problem}&count=${record.count}&username=${record.username}`}
                      name={`submit-${record.username}-${record.count}-${record.assignment}-${record.problem}${record.filetype}`}
                    />
                    <Link
                      to={`/admin/problem/${record.assignment}/${record.problem}/submissions/${record.username}/${record.count}`}
                    >
                      <EditOutlined />
                      查看提交
                    </Link>
                  </>
                );
              }}
            />
          </Table>
          <div style={{ float: "right", marginTop: "2em" }}>
            <Pagination
              current={page.page}
              pageSize={PAGE_SIZE}
              total={page.total}
              onChange={(p) =>
                history.push({
                  pathname: location.pathname,
                  search: `?page=${p}`,
                })
              }
            />
          </div>
        </>
      )}
    </>
  );
};
export default AdminSubmissionList;
