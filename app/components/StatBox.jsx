import React from "react";

const StatBox = ({ title, value, percentage, status }) => {
  return (
    <s-grid gap="small-300">
      <s-heading>{title}</s-heading>
      <s-stack direction="inline" gap="small-200">
        <s-text>{value}</s-text>
        <s-badge
          tone={status}
          icon={status === "warning" ? "arrow-down" : "arrow-up"}
        >
          {" "}
          {percentage}{" "}
        </s-badge>
      </s-stack>
    </s-grid>
  );
};

export default StatBox;
