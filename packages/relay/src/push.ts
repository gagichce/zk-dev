import prover from './singletons/prover'
import bent from 'bent'
import { stringifyBigInts } from '@unirep/utils'
import { UserState } from '@unirep/core'
import { Identity } from '@semaphore-protocol/identity'
import { DataProof } from '@unirep-app/circuits'
import { UNIREP_ADDRESS, provider, APP_ADDRESS } from './config'
let userState: UserState

const post = bent('http://localhost:8000/api/', 'POST', 'json', 200)

const id =
  '["0x8fa1a278bb0be561ff0631a50efdd85ec772637a8e82f5034a7064f5f24fb47","0x19f07c26afddf717be2a850a1acdb000fac41c80a16ae2bb907e95243a6d9d39"]'

const transitionUserStateIfNeeded = async () => {
  await userState.waitForSync()
  const currentEpoch = userState.sync.calcCurrentEpoch()
  const latestTransitionedEpoch = await userState.latestTransitionedEpoch()

  if (currentEpoch > latestTransitionedEpoch) {
    console.log(
      'Transitioning user state...',
      currentEpoch,
      latestTransitionedEpoch
    )
    let { publicSignals, proof } = await userState.genUserStateTransitionProof()

    try {
      const data = await post('transition', {
        publicSignals,
        proof,
      }).then((res) => res.json())
      console.log('data: ', data)
      await provider.waitForTransaction(data.hash)
      await userState.waitForSync()
    } catch (e) {
      console.log(e)
    }
  } else {
    console.log('User state is recent')
  }
}

const proveData = async (data: { [key: number]: string | number }) => {
  const epoch = await userState.sync.loadCurrentEpoch()
  const stateTree = await userState.sync.genStateTree(epoch)
  const index = await userState.latestStateTreeLeafIndex(epoch)
  const stateTreeProof = stateTree.createProof(index)
  const provableData = await userState.getProvableData()
  const sumFieldCount = userState.sync.settings.sumFieldCount
  const values = Array(sumFieldCount).fill(0)
  for (let [key, value] of Object.entries(data)) {
    values[Number(key)] = value
  }
  const attesterId = userState.sync.attesterId
  const circuitInputs = stringifyBigInts({
    identity_secret: userState.id.secret,
    state_tree_indexes: stateTreeProof.pathIndices,
    state_tree_elements: stateTreeProof.siblings,
    data: provableData,
    epoch: epoch,
    attester_id: attesterId,
    value: values,
  })
  const { publicSignals, proof } = await prover.genProofAndPublicSignals(
    'dataProof',
    circuitInputs
  )
  const dataProof = new DataProof(publicSignals, proof, prover)
  const valid = await dataProof.verify()
  // console.log('isValid: ', valid)
}

const main = async () => {
  console.log('Hello World!')

  const identity = new Identity(id)

  userState = new UserState(
    {
      provider,
      prover,
      unirepAddress: UNIREP_ADDRESS,
      attesterId: BigInt(APP_ADDRESS),
      _id: identity,
    },
    identity
  )

  await userState.sync.start()
  await userState.waitForSync()

  await transitionUserStateIfNeeded()

  console.log('Generating proof of reputation..')
  const { publicSignals, proof } = await userState.genEpochKeyProof({
    nonce: 0,
  })

  try {
    const response = await post('request', {
      reqData: {
        0: 1,
      },
      publicSignals,
      proof,
    })
  } catch (e) {
    console.log(e)
  }

  await proveData({ 0: 15 })
  await userState.sync.stop()
  process.exit(0)
}

main()
