import { useGravatar, Avatar } from "@agney/react-avatar";

const GravatarRound = ({ email, fullName, size, debug }) => {
  const url = useGravatar(email, { defaultImage: "retro" });
  const txt = !fullName.match(/^[A-Za-z]+$/)
    ? fullName.slice(-2)
    : fullName.slice(0, 2);
  return <Avatar src={debug ? "114514" : url} text={txt} size={size} />;
};

export default GravatarRound;
