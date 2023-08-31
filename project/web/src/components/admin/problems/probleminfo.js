import { useEffect, useState } from "react";
import http from "../../../utils/http";
import { Typography } from "antd";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { LoadingOutlined } from "@ant-design/icons";

const cached = {};

const AdminProbInfo = ({ apslug }) => {
  const { aslug, pslug } = apslug;
  const history = useHistory();
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    if (cached[`${aslug}-${pslug}`]) {
      setProblem(cached[`${aslug}-${pslug}`]);
    } else {
      http()
        .get("/problems", {
          params: {
            assignment: aslug,
            slug: pslug,
          },
        })
        .then((res) => {
          setProblem(res.data);
          cached[`${aslug}-${pslug}`] = res.data;
        })
        .catch((err) => {
          console.error(err);
          if (err.response.status === 404) {
            setProblem({ title: null });
          }
        });
    }
  }, [apslug, aslug, pslug]);
  return (
    <>
      <Typography.Link
        type={problem && problem.title === null ? "danger" : "primary"}
        onClick={() => history.push(`/admin/problem/${aslug}/${pslug}`)}
      >
        {!problem ? (
          <>
            <code>{`${aslug}-${pslug}`}</code>
            <LoadingOutlined />
          </>
        ) : (
          <>{problem.title ? `${problem.title}` : "问题不存在"}</>
        )}
      </Typography.Link>
    </>
  );
};
export default AdminProbInfo;
