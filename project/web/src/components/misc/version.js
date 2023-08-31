import React, { useEffect, useState } from "react";
import config from "../../config";
import http from "../../utils/http";
import { LoadingOutlined } from "@ant-design/icons";

const Version = () => {
  const [serverVersion, setServerVersion] = useState(null);

  useEffect(() => {
    http()
      .get(`/misc/version`)
      .then((res) => setServerVersion(res.data))
      .catch(() => setServerVersion("unknown"));
  }, []);

  return (
    <>
      Version: web {config.version},&nbsp; server{" "}
      {!serverVersion ? <LoadingOutlined /> : serverVersion}
    </>
  );
};

export default Version;
