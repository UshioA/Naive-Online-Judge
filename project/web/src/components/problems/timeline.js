import React, { useEffect, useState } from "react";
import moment from "moment";
import { Skeleton, Timeline, Typography, message } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import AdminSubmissionGrader from "../admin/submissions/grader";
import http from "../../utils/http";

const SubmissionTimeline = ({ id, submission }) => {
  const isTotal = (maxscore, score) => {
    return maxscore === score;
  };

  return (
    <Timeline pending={!submission.graded ? "等待系统处理……" : null}>
      {/* { !!submission.createdBy &&
        <Timeline.Item>
          本提交由 { submission.createdBy } 允许使用提交密钥创建。
        </Timeline.Item>
      } */}
      <Timeline.Item>
        Naive Online Judge 在
        {moment(submission.time).format(" YYYY-MM-DD HH:mm:ss ")}
        收到提交，编号为{" "}
        <Typography.Text code copyable={{ tooltips: "复制提交ID", text: id }}>
          {id.substr(-8)}
        </Typography.Text>
        。
      </Timeline.Item>
      {submission.result && (
        <>
          {/* { submission.result.error
          ? <>
            { submission.result.log &&
              <Timeline.Item>
                自动评分程序日志：<br />
                <pre style={ { whiteSpace: "pre-wrap" } }><code>{ submission.result.log }</code></pre>
              </Timeline.Item>
            }
            { submission.result.retryAt
              ? <Timeline.Item className="ant-timeline-item-last">
                自动评分遇到错误：{ submission.result.error }<br />
                评分系统将会在{ moment(submission.result.retryAt).format(" YYYY-MM-DD HH:mm:ss ") }后重新尝试评分。
              </Timeline.Item>
              :
              <Timeline.Item color="red" className="ant-timeline-item-last">
                自动评分遇到错误：{ submission.result.error }<br />
                错误报告时间：{ moment(submission.result.gradedAt).format(" YYYY-MM-DD HH:mm:ss ") }，请与管理员联系进行排查。
              </Timeline.Item> }
          </>
          : <> */}
          {submission.graded && submission.result.score !== null ? (
            <>
              <Timeline.Item color="green" className="ant-timeline-item-last">
                {submission.result.gradedBy ?? "Naive Online Judge"} 在
                {moment(submission.result.time).format(" YYYY-MM-DD HH:mm:ss ")}
                {"完成评分"}， 总得分 {submission.result.score}。<br />
                {submission.result.message && (
                  <pre style={{ overflow: "auto" }}>
                    评分信息：{submission.result.message}
                    <br />
                  </pre>
                )}
                {submission.result.details && (
                  <>
                    评分详情：
                    <ul>
                      {submission.result.details &&
                        submission.result.details.map((detail, index) => (
                          <li key={index}>
                            {isTotal(detail.maxscore, detail.score) && (
                              <CheckOutlined style={{ width: "1.5em" }} />
                            )}
                            {detail.title}：{detail.score}
                            {!!detail.message && `（${detail.message}）`}
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </Timeline.Item>
            </>
          ) : (
            <>
              <Timeline.Item className="ant-timeline-item-last">
                {submission.result.message}
              </Timeline.Item>
            </>
          )}
        </>
      )}
      {/* </> } */}
    </Timeline>
  );
};

export default SubmissionTimeline;
