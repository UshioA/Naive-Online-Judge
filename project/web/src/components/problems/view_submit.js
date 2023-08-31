import { useEffect, useState } from "react";
import http from "../../utils/http";
import { Button, Card, Col, Row, Skeleton, Spin, Table } from "antd";
import ColumnGroup from "antd/es/table/ColumnGroup";
import submitName from "../../utils/submitName";
import Download from "../../utils/download";
import moment from "moment";
import { ArrowRightOutlined, RedoOutlined } from "@ant-design/icons";
import SubmissionTimeline from "./timeline";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom/cjs/react-router-dom.min";

const ViewSubmit = ({ problem, flip, setFlip }) => {
  const location = useLocation();
  const [submitList, setSubmitList] = useState(null);
  const [selected, setSelected] = useState(null);
  const auth = useSelector((state) => state.auth.value);

  useEffect(() => {
    http()
      .get(
        `/submissions/all?assignment=${problem.assignment}&problem=${problem.slug}&username=${auth.user.username}`,
      )
      .then((res) => {
        setSubmitList(res.data.submissions);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [problem, auth, flip]);

  return (
    <Spin spinning={!submitList}>
      <Button
        icon={<RedoOutlined />}
        onClick={() => {
          setFlip(!flip);
        }}
      ></Button>
      <Row gutter={10}>
        <Col md={24} xl={9}>
          <Table
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
              title={"时间"}
              dataIndex={"time"}
              render={(t) => moment(t).locale("zh-cn").format("MM-DD HH:mm")}
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
                    {selected && id === selected.id && <ArrowRightOutlined />}
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
                    <Download
                      link={`/submissions/download?assignment=${problem.assignment}&problem=${problem.slug}&count=${selected.count}`}
                      name={submitName(
                        selected.assignment,
                        selected.problem,
                        selected.filetype,
                      )}
                    />
                  }
                >
                  <SubmissionTimeline id={selected.id} submission={selected} />
                </Card>
              )}
            </>
          )}
        </Col>
      </Row>
    </Spin>
  );
};

export default ViewSubmit;
