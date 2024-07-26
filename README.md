<!-- DOCTOC SKIP -->

<h1 align="center">
 <a href="https://www.thread.dev">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://www.thread.dev/favicon.png"/>
    <img height="40" src="https://www.thread.dev/favicon.png"/>
  </picture>
 </a>
</h1>
<p align="center">
AI-powered Jupyter Notebook
</p>
<p align="center">
  <a href="https://www.vizly.fyi/thread-dev"><img src="https://img.shields.io/badge/Website-blue?logo=googlechrome&logoColor=orange"/></a>
  <a href="https://cal.com/ali-shobeiri/30min"><img src="https://img.shields.io/badge/Book%20a%20Call-blue" /></a>
  <a href="mailto:ali@vizlylabs.com"><img src="https://img.shields.io/badge/Email%20Us-brightgreen" /></a>
  <a href="https://discord.gg/ZuHq9hDs2y"><img src="https://img.shields.io/badge/Join%20Discord-7289DA?logo=discord&logoColor=white" /></a>
  <a href="https://github.com/squaredtechnologies/thread/blob/main/LICENSE"><img src="https://img.shields.io/github/license/squaredtechnologies/thread"/></a>
  <a href="https://x.com/ThreadNotebooks"><img src="https://img.shields.io/twitter/follow/ThreadNotebooks?style=social"/></a>
  <a href="https://github.com/squaredtechnologies/thread"><img src="https://img.shields.io/github/stars/squaredtechnologies/thread" /></a>
</p>

[Thread](https://www.thread.dev) is a Jupyter alternative that integrates an AI copilot into your Jupyter Notebook editing experience.

Best of all, Thread runs locally and can be used for free with [Ollama](https://github.com/ollama/ollama) or your own API key. To start:

```
pip install thread-dev
```

To start thread-dev, run the following

```
thread
```

# Key features

### 1. Familiar Jupyter Notebook editing experience

![SameEditorExperience](https://github.com/squaredtechnologies/thread/assets/18422723/7bc86160-bd67-43dd-be86-bbf5360b5837)

### 2. Natural language code edits

![CellEditing](https://github.com/squaredtechnologies/thread/assets/18422723/73061e90-cc81-4bd7-b346-8bb01f5061a5)

### 3. Generate cells to answer natural language questions

![ThreadGenerateMode](https://github.com/squaredtechnologies/thread/assets/18422723/f8a6f2de-4c8d-4eb5-b9a8-2a0bfbd5e740)

### 4. Ask questions in a context aware chat sidebar

![ThreadChatDemo480](https://github.com/squaredtechnologies/thread/assets/18422723/a152550b-ede4-497b-9d48-bdff2f7ee7e4)

### 5. Automatically explain or fix errors

<img width="1112" alt="image" src="https://github.com/squaredtechnologies/thread/assets/18422723/93a16931-4236-4ab0-b5b5-673100af2ca0">

# Demo

https://github.com/squaredtechnologies/thread/assets/18422723/b0ef0d7d-bae5-48ad-b293-217b940385fb

![ThreadIntro](https://github.com/squaredtechnologies/thread/assets/18422723/ac49e65b-e8f7-4e7b-a349-76cf533178df)

# Feature Roadmap

These are some of the features we are hoping to launch in the next few month. If you have any suggestions or would like to see a feature added, please don't hesitate to open an issue or reach out to us [via email](mailto:ali@vizlylabs.com) or [discord](https://discord.gg/ZuHq9hDs2y).

-   [ ] Add co-pilot style inline code suggestions
-   [ ] Data warehouse + SQL support
-   [ ] No code data exploration
-   [ ] UI based chart creation
-   [ ] Ability to collaborate on notebooks
-   [ ] Publish notebooks as shareable webapps
-   [x] Add support for Jupyter Widgets
-   [ ] Add file preview for all file types

# Thread.dev Cloud

Eventually we hope to integrate Thread into a cloud platform that can support collaboration features as well hosting of notebooks as web application. If this sounds interesting to you, we are looking for enterprise design partners to partner with and customize the solution for. If you're interested, please reach out to us [via email](mailto:ali@vizlylabs.com) or [join our waitlist](https://waitlist.thread.dev).

# Development instructions

To run the repo in development mode, you need to run two terminal commands. One will run Jupyter Server, the other will run the NextJS front end.

To begin, run:

```
yarn install
```

Then in one terminal, run:

```
sh ./run_dev.sh
```

And in another, run:

```
yarn dev
```

Navigate to `localhost:3000/thread` and you should see your local version of Thread running.

If you would like to develop with the AI features, navigate to the `proxy` folder and run:

```
yarn install
```

Then:

```
yarn dev --port 5001
```

# Using Thread with Ollama

You can use [Ollama](https://github.com/ollama/ollama) for a fully offline AI experience. To begin, install and run thread using the commands above. 

Once you have run thread, in the bottom left, select the Settings icon:

![image](https://github.com/squaredtechnologies/thread/assets/18422723/b7dd8546-9aaa-47fe-b241-4f9ed085b633)

Next, select the Model Settings setting:

![image](https://github.com/squaredtechnologies/thread/assets/18422723/47e9f1f2-dd81-4aa1-9290-5e8c9445766a)

This is what you will see:

![image](https://github.com/squaredtechnologies/thread/assets/18422723/b218f005-afa4-40d6-835e-d2b6e14757b5)

Navigate to Ollama and enter your model details:

![image](https://github.com/squaredtechnologies/thread/assets/18422723/8b5cc906-d261-409d-b843-068be69ed410)

Use Ctrl / Cmd + K and try running a query to see how it looks!

# Why we built Thread

We initially got the idea when building [Vizly](https://vizly.fyi/) a tool that lets non-technical users ask questions from their data. While Vizly is powerful at performing data transformations, as engineers, we often felt that natural language didn't give us enough freedom to edit the code that was generated or to explore the data further for ourselves. That is what gave us the inspiration to start Thread.
