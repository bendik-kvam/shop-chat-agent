export default function Index() {
  return (
    <s-page>
      <ui-title-bar title="Shop chat agent reference app" />

      <s-section>
        <s-stack gap="base">
          <s-heading>Chat data</s-heading>
          <s-paragraph>
            Here you can see the usage on your store's chat
          </s-paragraph>
        </s-stack>
      </s-section>
      <s-section>
        <s-grid
          gridTemplateColumns="@container (inline-size <= 400px) 1fr, 1fr auto 1fr auto 1fr"
          gap="small"
        >
          <s-grid gap="small-300">
            <s-heading>Today</s-heading>
            <s-stack direction="inline" gap="small-200">
              <s-text>15</s-text>
              <s-badge tone="warning" icon="arrow-down">
                {" "}
                12%{" "}
              </s-badge>
            </s-stack>
          </s-grid>
          <s-divider direction="block" />

          <s-grid gap="small-300">
            <s-heading>Today</s-heading>
            <s-stack direction="inline" gap="small-200">
              <s-text>15</s-text>
              <s-badge tone="warning" icon="arrow-down">
                {" "}
                12%{" "}
              </s-badge>
            </s-stack>
          </s-grid>
        </s-grid>
      </s-section>
      <s-section heading="App template specs" slot="aside">
        <s-paragraph>
          <s-text>Framework: </s-text>
          <s-link href="https://reactrouter.com/" target="_blank">
            React Router
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Interface: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/app-home/using-polaris-components"
            target="_blank"
          >
            Polaris web components
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>API: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            GraphQL
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank">
            Prisma
          </s-link>
        </s-paragraph>
      </s-section>

      <s-section heading="Next steps" slot="aside">
        <s-text>Enable the theme extension in your theme editor.</s-text>
      </s-section>
    </s-page>
  );
}
