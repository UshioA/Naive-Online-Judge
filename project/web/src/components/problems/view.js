import { FloatButton, Skeleton, Tabs, Typography, Layout } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom/cjs/react-router-dom.min";
import "katex/dist/katex.min.css";
import "../../markdown.css";
import http from "../../utils/http";
import "highlight.js/styles/github.css";
import hljs from "highlight.js";
import {
  UploadOutlined,
  AlignLeftOutlined,
  ArrowUpOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { Markdown } from "../../utils/mark";
import ProbSubmit from "./submit";
import ViewSubmit from "./view_submit";
import submitName from "../../utils/submitName";

const ProbView = () => {
  const { aslug, bslug } = useParams();
  const [problem, setProblem] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [flip, setFilp] = useState(false);

  useEffect(() => {
    hljs.highlightAll();
  }, []);

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

  useEffect(() => {
    http()
      .get(`/problems?assignment=${aslug}&slug=${bslug}`)
      .then((res) => {
        setProblem(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [aslug, bslug]);

  return !assignment || !problem ? (
    <Skeleton title paragraph={{ rows: 10 }} round />
  ) : (
    <div id="viewProb">
      <div style={{ textAlign: "center" }}>
        <Typography.Title level={2}>{problem.title}</Typography.Title>
      </div>
      <Tabs
        hideAdd
        defaultActiveKey="description"
        type="card"
        onChange={() => setFilp(!flip)}
        items={[
          {
            key: "description",
            label: (
              <span>
                <AlignLeftOutlined /> {"描述"}
              </span>
            ),
            children: (
              <Layout style={{ margin: "0 1%" }}>
                <Markdown
                  mode="view"
                  value={problem.description}
                  style={{}}
                  hidetab={true}
                />
              </Layout>
            ),
          },
          {
            key: "submit",
            label: (
              <span>
                <UploadOutlined /> {"提交"}
              </span>
            ),
            children: (
              <ProbSubmit
                problem={problem}
                fileFormat={problem.submitFileType}
                fileName={submitName(
                  problem.assignment,
                  problem.slug,
                  problem.submitFileType,
                )}
                fileSize={problem.submitFileSize}
              />
            ),
          },
          {
            key: "view_submit",
            label: (
              <span>
                <DatabaseOutlined />
                查看提交
              </span>
            ),
            children: (
              <ViewSubmit problem={problem} flip={flip} setFlip={setFilp} />
            ),
          },
        ]}
      />
      <FloatButton
        icon={<ArrowUpOutlined />}
        onClick={() => {
          document
            .getElementById("viewProb")
            .scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
  );
};

export default ProbView;
