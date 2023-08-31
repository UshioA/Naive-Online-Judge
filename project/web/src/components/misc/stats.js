import { Button, Skeleton, Space, Table, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import http from "../../utils/http";

const AdminStats = () => {
  const columns = [
    {
      title: "作业",
      dataIndex: "assignment",
    },
    {
      title: "id",
      dataIndex: "id",
      render: (a) => <code>{a.substr(-8)}</code>,
    },
    {
      title: "问题",
      dataIndex: "slug",
    },
    {
      title: "总分",
      dataIndex: "totalScore",
    },
    {
      title: "操作",
      render: (text, record) => {
        const dl = () =>
          http()
            .post(
              "/statistics/csv",
              [{ assignment: record.assignment, problem: record.slug }],
              {
                responseType: "blob",
              },
            )
            .then((res) => {
              const file = new File(
                [res.data],
                `${record.assignment}-${record.slug}.csv`,
                { type: "text/csv;charset=utf-8" },
              );
              saveAs(file);
            })
            .catch((err) => {
              message.error("下载失败!");
              console.error(err);
            });
        return (
          <Button type="link" onClick={dl}>
            下载数据
          </Button>
        );
      },
    },
  ];

  const [selected, setSelected] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [problems, setProblems] = useState([]);
  const [pnum, setPNum] = useState(0);
  const [anum, setANum] = useState(0);
  useEffect(() => {
    http()
      .get("/assignments/all")
      .then((res) => {
        setAssignments(res.data.assignments);
      })
      .catch((err) => {
        message.error("获取作业列表失败");
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (assignments && anum < assignments.length) {
      http()
        .get("/problems/all", {
          params: {
            assignment: assignments[anum].slug,
          },
        })
        .then((res) => {
          setProblems([...problems, ...res.data.problems]);
          setANum(anum + 1);
          setPNum(pnum + res.data.total);
        });
    }
  }, [anum, assignments, pnum, problems]);

  const onSelectChange = (newSelected) => {
    setSelected(newSelected);
  };

  const rowSelection = {
    selected,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  return (
    <>
      <Button
        onClick={() => {
          http()
            .post(
              "/statistics/csv",
              selected.map((a) => ({
                assignment: a.split("-")[0],
                problem: a.split("-")[1],
              })),
              {
                responseType: "blob",
              },
            )
            .then((res) => {
              const file = new File(
                [res.data],
                `selected_${selected.length}_items.csv`,
                { type: "text/csv;charset=utf-8" },
              );
              saveAs(file);
            })
            .catch((err) => {
              message.error("下载失败");
              console.error(err);
            });
        }}
        icon={<DownloadOutlined />}
        style={{ float: "left", marginBottom: "1em" }}
        type="primary"
        disabled={selected.length === 0}
      >
        下载选中
      </Button>
      <Table
        size="middle"
        rowSelection={rowSelection}
        rowKey={(record) => `${record.assignment}-${record.slug}`}
        columns={columns}
        dataSource={problems}
      />
    </>
  );
};

export default AdminStats;
