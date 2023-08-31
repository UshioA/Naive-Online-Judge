import { useEffect, useState } from "react";
import http from "../../../utils/http";
import { LoadingOutlined } from "@ant-design/icons";

const cache = {};

const AdminGraderInfo = ({ assignment, problem, result }) => {
  const [g, setG] = useState(null);

  useEffect(() => {
    if (cache[`${assignment}-${problem}`]) {
      setG(cache[`${assignment}-${problem}`]);
    } else {
      http()
        .get("/grader", {
          params: {
            assignment: assignment,
            problem: problem,
          },
        })
        .then((res) => {
          setG(res.data.template);
          cache[`${assignment}-${problem}`] = res.data.template;
        })
        .catch((err) => {
          console.error(err);
          setG(null);
        });
    }
  }, [assignment, problem]);

  return g ? (
    g.human ? (
      `${result.score} / ${
        g.human.reduce((a, b) => ({ maxscore: a.maxscore + b.maxscore }), {
          maxscore: 0.0,
        }).maxscore
      }`
    ) : (
      `${result.score} / ${result.maxscore}`
    )
  ) : (
    <LoadingOutlined />
  );
};

export default AdminGraderInfo;
