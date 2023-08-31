import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  Radio,
  Row,
  Skeleton,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import ColumnGroup from "antd/es/table/ColumnGroup";
import submitName from "../../../utils/submitName";
import Download from "../../../utils/download";
import moment, { now } from "moment";
import { ArrowRightOutlined, RedoOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom/cjs/react-router-dom.min";
import Role from "../../../utils/role";
import SubmissionTimeline from "../../problems/timeline";
import http from "../../../utils/http";
import TODO from "../../misc/todo";
import AdminSubmissionGrader from "../submissions/grader";
import { useForm } from "antd/es/form/Form";
import AdminProblemStat from "./stats";

const AdminViewSubmit = () => {
  const [submitList, setSubmitList] = useState(null);
  const [selected, setSelected] = useState(null);
  const { aslug, bslug, username, count } = useParams();
  const auth = useSelector((state) => state.auth.value);
  const [flip, setFlip] = useState(false);
  const [grader, setGrader] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const form = useForm();
  const [filter, setFilter] = useState("both");

  useEffect(() => {
    setSelected(null);
  }, [filter]);

  const onFinish = (values) => {
    setDisabled(true);
    http()
      .put("/submissions", {
        assignment: selected.assignment,
        problem: selected.problem,
        username: selected.username,
        count: selected.count,
        filetype: selected.filetype,
        time: selected.time,
        graded: true,
        result: {
          score: Object.values(values).reduce(
            (a, b) => ({ score: a.score + b.score }),
            { score: 0.0 },
          ).score,
          maxscore: Object.values(values).reduce(
            (a, b) => ({ maxscore: a.maxscore + b.maxscore }),
            { score: 0.0 },
          ).maxscore,
          message: selected.result.message,
          time: moment(moment.now()).toISOString(),
          details: Object.values(values),
        },
      })
      .then((res) => {
        message.success("评分成功");
        setDisabled(false);
        setFlip(!flip);
      })
      .catch((err) => {
        console.error(err);
        setDisabled(false);
        setFlip(!flip);
      });
  };

  useEffect(() => {
    http()
      .get("/grader", {
        params: {
          assignment: aslug,
          problem: bslug,
        },
      })
      .then((res) => {
        setGrader(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [aslug, bslug]);

  const rejudge = (assignment, problem, count, username) => {
    message.info("已提交重测");
    http()
      .post("/submissions/rejudge", {
        assignment: assignment,
        problem: problem,
        count: count,
        username: username,
      })
      .then((res) => {})
      .catch((err) => {
        console.error(err);
      });
    setFlip(!flip);
  };

  useEffect(() => {
    if (!auth) return;
    if (Role.isLower(auth.user.role, Role.Staff)) {
      message.error("你没有权限访问此页面!");
    }
  }, [auth, flip]);

  useEffect(() => {
    if (username || selected)
      http()
        .get(`/submissions`, {
          params: {
            assignment: aslug,
            problem: bslug,
            username: selected ? selected.username : username ?? null,
            count: selected ? selected.count : count ?? null,
          },
        })
        .then((res) => {
          setSelected(res.data);
        })
        .catch((err) => {
          console.error(err);
        });
  }, [aslug, bslug, username, count, flip]);

  useEffect(() => {
    http()
      .get(
        `/submissions/all?assignment=${aslug}&problem=${bslug}${
          filter === "both" ? "" : `&graded=${filter}`
        }`,
      )
      .then((res) => {
        setSubmitList(res.data.submissions);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [aslug, bslug, auth, flip, filter]);

  return (
    <>
      <AdminProblemStat
        assignment={aslug}
        problem={bslug}
        flip={flip}
        setFlip={setFlip}
        grader={grader}
      />
      <Divider />
      {Role.isLower(Role.Student, auth.user.role) ? (
        <Spin spinning={!submitList}>
          <Space>
            <Radio.Group
              defaultValue={"both"}
              style={{ float: "left" }}
              onChange={(e) => setFilter(e.target.value)}
            >
              <Radio.Button value={"both"}>全部</Radio.Button>
              <Radio.Button value={"y"}>已评分</Radio.Button>
              <Radio.Button value={"n"}>未评分</Radio.Button>
            </Radio.Group>
            {/* <Button icon={ <RedoOutlined /> } disabled={ grader ? grader.template.ishuman : true } onClick={ () => rejudgeAll() }>
              <Typography.Text>
                重测所有提交
              </Typography.Text>
            </Button> */}
            <Button
              icon={<RedoOutlined />}
              onClick={() => {
                setFlip(!flip);
              }}
            ></Button>
          </Space>
          <Row gutter={10}>
            <Col md={24} xl={9}>
              <Table
                style={{ marginTop: "1.5em" }}
                dataSource={submitList}
                onRow={(record) => {
                  return {
                    onClick: () => setSelected(record),
                  };
                }}
              >
                {/* <ColumnGroup title={ "次序" } dataIndex={ 'count' } render={ (index) => { return <Typography.Text>#{ index }</Typography.Text> } } /> */}
                <ColumnGroup
                  title={"编号"}
                  dataIndex={"id"}
                  render={(id) => <code>{id.substr(-8)}</code>}
                />
                <ColumnGroup
                  title={"用户"}
                  dataIndex={"username"}
                  render={(name) => <Tag>{name}</Tag>}
                />
                <ColumnGroup
                  title={"时间"}
                  dataIndex={"time"}
                  render={(t) =>
                    moment(t).locale("zh-cn").format("MM-DD HH:mm")
                  }
                />
                <ColumnGroup
                  title={"得分"}
                  dataIndex={"result"}
                  render={(r) => r.score}
                />
                <ColumnGroup
                  title={"查看"}
                  dataIndex={"id"}
                  render={(id) => {
                    return (
                      <>
                        {selected && id === selected.id && (
                          <ArrowRightOutlined />
                        )}
                      </>
                    );
                  }}
                />
              </Table>
            </Col>
            <Col md={24} xl={15}>
              {!selected ? (
                <p style={{ margin: "1em" }}>
                  在左侧列表中点击某次提交来查看详情。
                </p>
              ) : (
                <>
                  {!submitList ? (
                    <Skeleton />
                  ) : (
                    <Card
                      title={`提交 ${selected.id}`}
                      extra={
                        <>
                          <Download
                            link={`/submissions/download?assignment=${selected.assignment}&problem=${selected.problem}&count=${selected.count}&username=${selected.username}`}
                            name={submitName(
                              selected.assignment,
                              selected.problem,
                              selected.filetype,
                            )}
                          />
                          {grader &&
                          (!grader.template.ishuman ||
                            (grader.template.ishuman && selected.graded)) ? (
                            <Button
                              onClick={() =>
                                !grader.template.ishuman
                                  ? rejudge(
                                      selected.assignment,
                                      selected.problem,
                                      selected.count,
                                      selected.username,
                                    )
                                  : (() => {
                                      setDisabled(true);
                                      http()
                                        .put("/submissions", {
                                          assignment: selected.assignment,
                                          problem: selected.problem,
                                          username: selected.username,
                                          count: selected.count,
                                          filetype: selected.filetype,
                                          time: selected.time,
                                          graded: false,
                                          result: {
                                            score: selected.result.score,
                                            maxscore: selected.result.maxscore,
                                            message: selected.result.message,
                                            time: selected.result.time,
                                            details: selected.result.details,
                                          },
                                        })
                                        .then((res) => {
                                          setFlip(!flip);
                                          setDisabled(false);
                                        })
                                        .catch((err) => {
                                          console.error(err);
                                        });
                                    })()
                              }
                            >
                              <RedoOutlined />
                              重测这个提交
                            </Button>
                          ) : (
                            <></>
                          )}
                        </>
                      }
                    >
                      <SubmissionTimeline
                        id={selected.id}
                        submission={selected}
                      />
                      {grader != null &&
                        grader.template.ishuman &&
                        selected &&
                        !selected.graded && (
                          <Card>
                            <AdminSubmissionGrader
                              submission={selected}
                              grader={grader}
                              form={form}
                              disabled={disabled}
                              onFinish={onFinish}
                            />
                          </Card>
                        )}
                    </Card>
                  )}
                </>
              )}
            </Col>
          </Row>
        </Spin>
      ) : (
        <></>
      )}
    </>
  );
};

export { AdminViewSubmit };
