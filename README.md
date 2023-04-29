# zk-dev

This is a demo app of a [unirep](https://github.com/Unirep/Unirep) reputation based git server.

In this demo app, users can push commits to different branches based on their reputation.
Contributing to a project increases their reputation, while spamming or pushing bad commits decreases their reputation (not yet implemented).
The reputation is issues by the organization

> See: [Users and Attesters](https://developer.unirep.io/docs/protocol/users-and-attesters)

## 1. Installation

```shell
yarn
```

## 2 Start with each daemon

### 2.1 Build the files

```shell
yarn build
```

### 2.2 Start a node

```shell
yarn contracts hardhat node
```

### 2.3 Deploy smart contracts

in new terminal window, from root:

```shell
yarn contracts deploy
```

### 2.4 Start a relayer (backend)

```shell
yarn relay start
```

### 2.5 Start a frontend

in new terminal window, from root:

```shell
yarn frontend start
```

It will be running at: http://localhost:3000/

added new lines
more lines
something every dev should know!
an important note
an important note
