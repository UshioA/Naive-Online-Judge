import {
  Button,
  Col,
  Descriptions,
  Dropdown,
  Row,
  Skeleton,
  Statistic,
  Typography,
  message,
} from "antd";
import { DownloadOutlined, LoadingOutlined } from "@ant-design/icons";
import TODO from "../../misc/todo";
import { useEffect, useState } from "react";
import http from "../../../utils/http";
import { saveAs } from "file-saver";

const ProblemMaxScore = ({ assignment, problem }) => {
  const [stat, setStat] = useState(null);

  useEffect(() => {
    http()
      .get("/statistics/single", {
        params: {
          assignment: assignment,
          problem: problem,
        },
      })
      .then((res) => {
        setStat(res.data);
      })
      .catch((err) => {
        console.error(err);
        message.error("获取最高分信息失败");
      });
  }, [assignment, problem]);

  return stat ? stat.best : <LoadingOutlined />;
};

const AdminProblemStat = ({ assignment, problem, flip, setFlip, grader }) => {
  const [loadingAllSub, setLoadingAllSub] = useState(false);
  const [loadingAllBest, setLoadingAllBest] = useState(false);

  const downloadAllSubmit = () => {
    setLoadingAllSub(true);
    http()
      .get("/problems/download", {
        params: {
          assignment: assignment,
          problem: problem,
        },
        responseType: "blob",
      })
      .then((res) => {
        const file = new File(
          [res.data],
          `submit-${assignment}-${problem}.tar`,
          { type: "application/x-tar;charset=utf-8" },
        );
        saveAs(file);
        setLoadingAllSub(false);
      })
      .catch((err) => {
        console.error(err);
        message.error("下载失败");
        setLoadingAllSub(false);
      });
  };

  const downloadAllBest = () => {
    setLoadingAllBest(true);
    http()
      .get("/problems/download/best", {
        params: {
          assignment: assignment,
          problem: problem,
        },
        responseType: "blob",
      })
      .then((res) => {
        const file = new File([res.data], `best-${assignment}-${problem}.tar`, {
          type: "application/x-tar;charset=utf-8",
        });
        saveAs(file);
        setLoadingAllBest(false);
      })
      .catch((err) => {
        console.error(err);
        message.error("下载失败");
        setLoadingAllSub(false);
      });
  };

  const downloadAllScore = () => {
    http()
      .post("/statistics/csv", [{ assignment: assignment, problem: problem }], {
        responseType: "blob",
      })
      .then((res) => {
        const file = new File([res.data], `${assignment}-${problem}.csv`, {
          type: "text/csv;charset=utf-8",
        });
        saveAs(file);
      })
      .catch((err) => {
        message.error("下载失败!");
        console.error(err);
      });
  };
  const [stat, setStat] = useState(null);

  useEffect(() => {
    http()
      .get("/statistics/problem", {
        params: {
          assignment: assignment,
          problem: problem,
        },
      })
      .then((res) => {
        setStat(res.data);
      })
      .catch((err) => {
        message.error("获取问题信息失败");
        setStat(null);
        console.error(err);
      });
  }, [assignment, problem]);

  const items = [
    {
      key: "1",
      label: "重测所有提交",
      disabled: grader ? grader.template.ishuman : true,
    },
    {
      key: "2",
      label: "下载所有提交",
    },
    {
      key: "3",
      label: "下载所有最高分提交",
    },
    {
      key: "4",
      label: "下载所有得分",
    },
  ];

  const rejudgeAll = () => {
    http()
      .get("/problems", {
        params: {
          assignment: assignment,
          slug: problem,
        },
      })
      .then((res) => {
        http()
          .post("/problems/rejudge", res.data)
          .then((res) => {
            setFlip(!flip);
          })
          .catch((err) => {
            console.error(err);
            setFlip(!flip);
          });
      })
      .catch((err) => {
        message.error("获取problem失败");
        console.error(err);
        setFlip(!flip);
      });
  };

  return (
    <>
      <Typography.Title level={2}>
        提交信息
        <div style={{ float: "right" }}>
          <Dropdown.Button
            menu={{
              items,
              onClick: ({ key }) => {
                switch (key) {
                  case "1":
                    rejudgeAll();
                    break;
                  case "2":
                    downloadAllSubmit();
                    break;
                  case "3":
                    downloadAllBest();
                    break;
                  case "4":
                    downloadAllScore();
                    break;
                  default:
                    message.error("非法的选择项");
                }
              },
            }}
            loading={loadingAllSub || loadingAllBest}
          >
            选项
          </Dropdown.Button>
        </div>
        {/* <Button type='primary' style={ { float: 'right' } } onClick={ downloadAll } icon={ <DownloadOutlined /> }>
        下载得分信息
      </Button> */}
      </Typography.Title>
      {stat ? (
        <Row gutter={16}>
          <Col>
            <Statistic
              title={"AC / 提交人数"}
              value={stat.ac}
              suffix={`/ ${stat.num}`}
            />
          </Col>
          <Col>
            <Statistic title={`未提交人数`} value={stat.total - stat.num} />
          </Col>
          <Col>
            <Statistic title={"提交均分"} value={stat.avg} />
          </Col>
          <Col>
            <Statistic
              title={`全体均分`}
              value={(stat.num * stat.avg) / stat.total}
            />
          </Col>
        </Row>
      ) : (
        <Skeleton loading={true} />
      )}
    </>
  );
};

export default AdminProblemStat;
export { ProblemMaxScore };
