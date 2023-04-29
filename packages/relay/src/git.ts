import { Git } from 'node-git-server'
import { join } from 'path'
import { inspect } from 'util'
import { Synchronizer } from '@unirep/core'
import { DataProof } from '@unirep-app/circuits'
import prover from './singletons/prover'
import { utils, BigNumber } from 'ethers'

export default (synchronizer: Synchronizer) => {
  const port = 7005

  const gate_auth_scope = async (operation) => {
    let { headers } = operation.req
    let { authorization } = headers

    let { publicSignals, proof } = JSON.parse(authorization || '')

    const data_proof = new DataProof(publicSignals, proof, synchronizer.prover)

    const valid = await data_proof.verify()

    if (!valid) {
      console.log('invalid proof, will reject')
      // operation.log('Proof is not valid!')
    }

    operation.req.proof = proof
    let [, commits, stars, forks, lgtms] = publicSignals.map(BigNumber.from)
    let data = { commits, stars, forks, lgtms }
    console.log(data)
    operation.req.data = data

    return valid
  }

  const gate_min_reputation = async (
    operation,
    min_reputation = BigNumber.from('100')
  ) => {
    let { data } = operation.req

    if (min_reputation.gte(data.commits)) {
      console.log('Not enough reputation!')
      operation.log('Not enough reputation!')
      return false
    }
    return true
  }

  const repos = new Git(join(__dirname, '../repo'), {
    autoCreate: true,
    // don't use, you can't run async things in here it breaks everything
    authenticate: (options, next) => {
      let { headers, repo, type } = options
      let { authorization } = headers

      return next()
    },
  })

  repos.on('push', async (push) => {
    console.log(`push ${push.repo}/${push.commit} ( ${push.branch} )`)

    let valid = await gate_auth_scope(push)
    if (!valid) {
      push.reject(403, "You don't have permission to push")
      return push.end()
    }

    let min_reputation = BigNumber.from('0')
    console.log(push.branch)
    if (push.branch == 'main') {
      min_reputation = BigNumber.from('100')
    }

    // if()
    let reputation = await gate_min_reputation(push, min_reputation)
    if (!reputation) {
      push.log("You don't have enough reputation to push")
      return push.reject(403, "You don't have enough reputation to push")
      // return push.end()
    }

    push.accept()
  })

  repos.on('head', (head) => {
    console.log(`head ${head.repo}/${head.commit} ( ${head.branch} )`)
    head.accept()
  })

  repos.on('info', async (info) => {
    let valid = await gate_auth_scope(info)
    console.log(`info ${info.req.url}`)
    info.accept()
  })

  repos.on('fetch', (fetch) => {
    console.log(`fetch ${fetch.commit}`)
    fetch.accept()
  })

  repos.listen(port, { type: 'http' }, () => {
    console.log(`node-git-server running at http://localhost:${port}`)
  })
}
