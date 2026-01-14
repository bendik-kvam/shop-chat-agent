import React from "react";
import StatBox from "./statBox";

const statGrid = ({ title, children }) => {
  return (
    <s-section>
      <s-heading>{title}</s-heading>
      <s-grid
        gridTemplateColumns="@container (inline-size <= 400px) 1fr, 1fr auto 1fr auto 1fr"
        gap="small"
      >
        {children.map((child, index) => {
          return (
            <StatBox
              key={index}
              title={child.title}
              value={child.value}
              percentage={child.percentage}
              status={child.status}
            />
          );
        })}
      </s-grid>
    </s-section>
  );
};

export default statGrid;
