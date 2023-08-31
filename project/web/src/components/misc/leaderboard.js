import { useEffect, useState } from "react";
import http from "../../utils/http";
import { Spin, Table, Typography, message } from "antd";
import Column from "antd/es/table/Column";
import { useSelector } from "react-redux";

const LeaderBoard = () => {
  const [gdlist, setGdList] = useState(null);
  const auth = useSelector((state) => state.auth.value);
  useEffect(() => {
    http()
      .get("/users/gongde/rank")
      .then((res) => {
        if (res.status === 200) {
          setGdList(
            [...res.data.users]
              .sort((a, b) => a.gongde - b.gongde)
              .reverse()
              .map((v, i) => {
                return { index: i + 1, ...v };
              }),
          );
        }
      })
      .catch((err) => {
        message.error("和西天失去联系");
        console.log(err);
      });
  }, []);
  return gdlist ? (
    <>
      <Table dataSource={gdlist} size="small">
        <Column
          title={"排名"}
          dataIndex={"index"}
          key={"index"}
          render={(i) => {
            var str = "";
            if (i === 1) {
              str = `🥇 ${i}`;
            } else if (i === 2) {
              str = `🥈 ${i}`;
            } else if (i === 3) {
              str = `🥉 ${i}`;
            } else {
              str = `${i}`;
            }
            return (
              <div style={{ textAlign: "right", float: "left", width: "3em" }}>
                {str}
              </div>
            );
          }}
        />
        <Column
          title={"姓名"}
          dataIndex={"fullname"}
          key={"fullname"}
          render={(fullname) => {
            if (fullname === auth.user.fullname) {
              return (
                <Typography.Text type="success">{fullname}</Typography.Text>
              );
            }
            return <Typography.Text>{fullname}</Typography.Text>;
          }}
        />
        <Column title={"功德"} dataIndex={"gongde"} key={"gongde"} />
      </Table>
    </>
  ) : (
    <Spin delay={100} tip="正在与西天取得联系">
      <Table />
    </Spin>
  );
};

export default LeaderBoard;
