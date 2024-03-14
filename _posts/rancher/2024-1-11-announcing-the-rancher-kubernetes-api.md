---
layout: post
title: Rancher v2.8 推出 RK-API：革新管理方式，实现 Kubernetes 式资源管理
subtitle: Rancher v2.8 引入全新的官方支持 API - Rancher Kubernetes API（RK-API），为用户提供了更便捷、创新的资源管理方式，助力 Rancher 的自动化管理体验。
date: 2024-1-11 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
---

我们很高兴向大家介绍 Rancher v2.8 中的首个官方支持 API：Rancher Kubernetes API（简称 RK-API）。

自从 Rancher v2.0 发布以来，公开支持的 API 一直是我们最受欢迎的功能之一。但 Rancher APIs（你可能熟悉的是 v3（Norman）或 v1（Steve））从未得到官方支持，只能通过我们的 Terraform Provider 实现自动化。

推出 RK-API 之后，就可以向管理 Kubernetes 一样管理 Rancher。通过利用 Rancher Manager 已使用的自定义资源，并直接与 Kubernetes API 通信。通过使用自定义资源，任何兼容 Kubernetes 的工具，如 kubectl 或 GitOps 引擎（如 Fleet），都可以轻松实现 Rancher 的自动化，并变得更加易于访问。

随着 Rancher v2.8.0 的发布，我们迎来了支持的自定义资源的首个阶段，包括 Projects、GlobalRoles、RoleTemplates、GlobalRoleBindings、ClusterRoleTemplateBindings 和 ProjectRoleTemplateBindings，更多资源将在后续发布。一旦完成升级，你就可以通过 RK-API 与任何现有集群中的这些自定义资源进行交互。

现在，让我们看看 RK-API 是如何工作的。

## 创建和修改资源

在展示这一新 API 特性的过程中，项目的创建是一个绝佳的示例。如果我想在托管的集群中创建项目，而不是在仪表板中手动操作，我可以直接将项目的 YAML 应用于我的 Rancher 管理集群。

首先，你需要 Rancher 管理集群的 Kubeconfig。[API 的快速入门指南](https://ranchermanager.docs.rancher.com/v2.8/api/quickstart "API 快速入门指南")中介绍了如何创建它。

接下来，我会获取我托管集群的 ID。请注意，这是集群的 metadata.name，而不是 displayName。

然后，我可以使用这个 ID 在该集群中创建一个项目，例如使用随机生成的项目名称：

```
$ kubectl get clusters.management.cattle.io
NAME           AGE
c-m-bsg27dgn   13m
local          76m
```

```
kubectl create -f - <<EOF
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  generateName: p-
  namespace: c-m-bsg27dgn
spec:
  clusterName: c-m-bsg27dgn
  displayName: project-from-api
EOF
```

现在我们可以在 UI 中看到一个项目存在：

![](https://www.suse.com/c/wp-content/uploads/2024/01/ProjectNamespaces-2048x1181.png)

要理解每个字段的含义以及哪些是必需的，你可以像在 Kubernetes 资源中那样使用 `kubectl explain project`：

```
$ kubectl explain projects.management.cattle.io
KIND:     Project
VERSION:  management.cattle.io/v3
DESCRIPTION:
     Project is a group of namespaces. Projects are used to create a
     multi-tenant environment within a Kubernetes cluster by managing namespace
     operations, such as role assignments or quotas, as a group.
FIELDS:
   apiVersion    <string>
     APIVersion defines the versioned schema of this representation of an.....
```

要修改或使用该项目，首先查找在集群命名空间中的项目名称，因为它是使用 metadata generateName 创建的，具有不可预测的 ID。

现在，删除或编辑项目变得很简单；在集群命名空间下引用它：

```
$ kubectl --namespace c-m-bsg27dgn get projects
NAME           AGE
p-9x7lg        45s
kubectl --namespace c-m-bsg27dgn edit project p-9x7lg
```

一个重要的注意事项是，自定义资源可以存在于 Rancher 管理集群或托管的（下游）集群中，项目和命名空间就是一个例子。虽然项目资源存在于管理集群中，但命名空间资源存在于托管的集群中。因此，为了在新项目中创建命名空间，你需要切换 [Kubeconfig](https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/ "配置对多个集群的访问") 到托管的集群，然后只需使用正确的 annotation 创建命名空间：

```
field.cattle.io/projectId: <cluster- id>:<project-id>
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: mynamespace
  annotations:
    field.cattle.io/projectId: c-m-bsg27dgn:p-9x7lg
EOF
```

现在我们可以看到命名空间已经存在：

![](https://www.suse.com/c/wp-content/uploads/2024/01/mynamespace-2048x1179.png)

## 通过 GitOps 使用 API

这个新 API 的令人兴奋的应用之一是通过现代基础设施管道部署资源。在这个例子中，我们将使用 Rancher 内置的持续交付系统，也称为 Fleet。首先，你可以创建一个包含以下内容的 Git 存储库，内容在 project/project.yml 文件中：

```
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: project-test
  namespace: c-m-bsg27dgn
spec:
  clusterName: c-m-bsg27dgn
  displayName: project-test
```

然后，在 Rancher 中应用这个文件，通过创建一个 GitRepo，它将将项目部署到管理集群：

```
kubectl apply -f - <<EOF
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
name: test
  namespace: fleet-local
spec:
  repo: "REPO_URL"
  branch: main
  paths:
    - projects
EOF
```

一旦应用，你会发现你的新项目已在托管的集群中创建。现在，让我们迈出最后一步：将用户添加到项目中。

如果我们检查项目，我们会看到现在已经成功添加了一个项目成员！你可以看到，在大规模环境中管理资源就像编辑或复制几个文件一样简单。

![](https://www.suse.com/c/wp-content/uploads/2024/01/DefaultAdminLocal-2048x1182.png)

```
apiVersion: management.cattle.io/v3
kind: ProjectRoleTemplateBinding
metadata:
  name: add-proj-member
  namespace: project-test
projectName: c-m-bsg27dgn:project-test
roleTemplateName: project-member
userName: user-gvmvn
```

## 总结

虽然在 2.8.0 版本中只有一小部分 CRDs 生效，但它们都是常用的资源类型，并且目前正在为即将发布的版本开发更多的 CRDs。我们相信这个新的 API 将为客户带来巨大的好处，同时也是对 Rancher Manager 及其功能的稳定性和文档的承诺。

有关更多详细信息，请查看新的[文档页面](https://ranchermanager.docs.rancher.com/v2.8/api/quickstart "Rancher Kubernetes API")。这包括快速入门、API 参考和常见工作流程等内容。
