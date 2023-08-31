import {
  Button,
  Pagination,
  Popconfirm,
  Skeleton,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import qs from "qs";
import {
  useHistory,
  useLocation,
} from "react-router-dom/cjs/react-router-dom.min";
import http from "../../../utils/http";
import ColumnGroup from "antd/es/table/ColumnGroup";
import { DashboardOutlined, PlusOutlined } from "@ant-design/icons";

const AdminGtList = () => {
  const [page, setPage] = useState(null);
  const PAGE_SIZE = 10;
  const location = useLocation();
  const history = useHistory();
  const [refetch, setRefetch] = useState(false);

  const deleteGt = (slug) => {
    http()
      .delete("/gt", { params: { slug: slug } })
      .then((res) => {
        message.success("已删除");
        setRefetch(!refetch);
      })
      .catch((err) => {
        console.error(err);
        message.error("删除失败");
      });
  };

  useEffect(() => {
    const page =
      qs.parse(location.search, { ignoreQueryPrefix: true }).page ?? 1;
    http()
      .get("/gt/all", {
        params: {
          start: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        },
      })
      .then((res) => {
        setPage({ gts: res.data.gts, total: res.data.total, page: +page });
      })
      .catch((err) => {
        console.error(err);
      });
  }, [location.search, refetch]);

  return (
    <>
      <Typography.Title level={2}>
        <DashboardOutlined /> 模板管理
        <Button
          style={{ marginBottom: "1em", float: "right" }}
          type="primary"
          onClick={() => {
            history.push("/admin/gts/make");
          }}
        >
          <PlusOutlined />
          新建模板
        </Button>
      </Typography.Title>
      {page ? (
        <>
          <Table dataSource={page.gts} pagination={false}>
            <ColumnGroup
              dataIndex={"id"}
              title={"编号"}
              render={(a) => <code>{a.substr(-8)}</code>}
            />
            <ColumnGroup dataIndex={"slug"} title={"名字"} />
            <ColumnGroup
              dataIndex={"ishuman"}
              title={"类型"}
              render={(human) => {
                return <Tag>{human ? `人工评分` : `自动评分`}</Tag>;
              }}
            />
            <ColumnGroup
              title={"操作"}
              render={(text, record) => {
                return (
                  <>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        history.push(`/admin/gts/edit/${record.slug}`);
                      }}
                    >
                      修改
                    </Button>
                    <Popconfirm
                      title={`删除模板`}
                      description={`确定删除这个模板吗?`}
                      onConfirm={() => deleteGt(record.slug)}
                    >
                      <Button type="link" size="small">
                        <Typography.Text type="danger">删除</Typography.Text>
                      </Button>
                    </Popconfirm>
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
      ) : (
        <Skeleton />
      )}
    </>
  );
};

export default AdminGtList;
