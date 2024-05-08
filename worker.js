const discordWebhookUrl = DISCORD_WEBHOOK;

async function handleRequest(req) {
  if (req.method !== 'POST') {
    return new Response('Expected POST', { status: 405 });
  }

  try {
    const githubEvent = await req.json();

    if (!githubEvent.repository || githubEvent.repository.private) {
      return new Response('Not forwarding private repository events', { status: 200 });
    }

    let embed = {
      title: `${githubEvent.repository.full_name}`,
      description: "",
      color: 5814783,
      fields: [],
      footer: { text: "GitHub" },
      timestamp: new Date().toISOString()
    };

    if (githubEvent.issue) {
      const type = "Issue";
      embed.title = `[${githubEvent.repository.name}] ${type} ${githubEvent.action}: #${githubEvent.issue.number}`;
      embed.description = `${githubEvent.issue.title.substring(0, 100)} - [${githubEvent.issue.user.login}](https://github.com/${githubEvent.issue.user.login})` + (githubEvent.issue.title.length > 100 ? "..." : "");
      embed.color = 800080;
    }

    if (githubEvent.pull_request) {
      const type = "Pull Request";
      embed.title = `[${githubEvent.repository.name}] ${type} ${githubEvent.action}: #${githubEvent.pull_request.number}`;
      embed.description = `${githubEvent.pull_request.title.substring(0, 100)} - [${githubEvent.pull_request.user.login}](https://github.com/${githubEvent.pull_request.user.login})` + (githubEvent.pull_request.title.length > 100 ? "..." : "");
      embed.color = 0xFF0000;
    }

    if (githubEvent.commits && githubEvent.commits.length > 0) {
      embed.title = `[${githubEvent.repository.name}:${githubEvent.ref.replace('refs/heads/', '')}] ${githubEvent.commits.length} new commit(s)`;
      embed.description = githubEvent.commits.map(commit => {
        const username = commit.author.username || commit.committer.username || "Unknown user";
        const userUrl = `https://github.com/${username}`;
        return `[${commit.id.substring(0, 7)}](https://github.com/${githubEvent.repository.full_name}/commit/${commit.id}) - ${commit.message.substring(0, 120)}... - [${username}](${userUrl})`;
      }).join('\n');
    }

    if (githubEvent.comment) {
      const type = githubEvent.issue ? "Issue" : "Pull Request";
      embed.title = `[${githubEvent.repository.name}] Comment on ${type}: #${githubEvent.issue ? githubEvent.issue.number : githubEvent.pull_request.number}`;
      embed.description = `${githubEvent.comment.body.substring(0, 100)} - [${githubEvent.comment.user.login}](https://github.com/${githubEvent.comment.user.login})` + (githubEvent.comment.body.length > 100 ? "..." : "");
      embed.color = 0x00FFFF;
    }

    if (githubEvent.release && githubEvent.action === 'published') {
      embed.title = `[${githubEvent.repository.full_name}] New release published: ${githubEvent.release.tag_name}`;
      embed.description = `Release details: [${githubEvent.release.name || "No additional details"}](https://github.com/${githubEvent.repository.full_name}/releases/tag/${githubEvent.release.tag_name})`;
      embed.color = 0x008000;
    }

    if (githubEvent.ref_type === 'tag' && githubEvent.action === 'created') {
      embed.title = `[${githubEvent.repository.full_name}] New tag added: ${githubEvent.ref}`;
      embed.description = `A new tag was created: [${githubEvent.ref}](https://github.com/${githubEvent.repository.full_name}/releases/tag/${githubEvent.ref})`;
      embed.color = 0x008000;
    }

    const discordReq = new Request(discordWebhookUrl, {
      method: 'POST',
      body: JSON.stringify({ embeds: [embed] }),
      headers: { 'Content-Type': 'application/json' },
    });

    return fetch(discordReq);

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response('Error processing request', { status: 500 });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
