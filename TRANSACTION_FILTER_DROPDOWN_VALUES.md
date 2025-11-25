# Transaction Filter Dropdown Values

This document provides the complete list of values that should be used in transaction filter dropdowns on the frontend, based on the actual transaction message types in Pocket Network.

## Transaction Type Filter

The transaction type is derived from the message type in the transaction. Based on the classification logic and `POCKET_NETWORK_MESSAGE_TYPES.md`, here are all possible transaction type values:

### Application Module Types
- `MsgStakeApplication (application)` - Application staking
- `MsgUnstakeApplication (application)` - Application unstaking
- `MsgDelegateToGateway (application)` - Application delegating to gateway
- `MsgUndelegateFromGateway (application)` - Application undelegating from gateway
- `MsgTransferApplication (application)` - Application ownership transfer
- `MsgUpdateParam (application)` - Application module parameter update

### Supplier Module Types
- `MsgStakeSupplier (supplier)` - Supplier staking
- `MsgUnstakeSupplier (supplier)` - Supplier unstaking
- `MsgUpdateParam (supplier)` - Supplier module parameter update

### Gateway Module Types
- `MsgStakeGateway (gateway)` - Gateway staking
- `MsgUnstakeGateway (gateway)` - Gateway unstaking
- `MsgUpdateParam (gateway)` - Gateway module parameter update

### Service Module Types
- `MsgAddService (service)` - Add new service to network
- `MsgUpdateParam (service)` - Service module parameter update

### Proof Module Types
- `MsgCreateClaim (proof)` - Supplier submits claim for relays
- `MsgSubmitProof (proof)` - Supplier submits proof for claim verification
- `MsgUpdateParam (proof)` - Proof module parameter update

### Session Module Types
- `MsgUpdateParam (session)` - Session module parameter update

### Tokenomics Module Types
- `MsgUpdateParam (tokenomics)` - Tokenomics module parameter update

### Shared Module Types
- `MsgUpdateParam (shared)` - Shared module parameter update

### Migration Module Types
- `MsgClaimMorseAccount (migration)` - Claim Morse account during migration
- `MsgClaimMorseApplication (migration)` - Claim Morse application during migration
- `MsgClaimMorseSupplier (migration)` - Claim Morse supplier during migration

### Cosmos SDK Bank Types
- `MsgSend (bank)` - Standard token transfer
- `MsgMultiSend (bank)` - Multiple token transfers

### Cosmos SDK Staking Types
- `MsgDelegate (node)` - Delegate tokens to validator
- `MsgUndelegate (node)` - Undelegate tokens from validator
- `MsgBeginRedelegate (node)` - Begin redelegation
- `MsgCreateValidator (node)` - Create new validator
- `MsgEditValidator (node)` - Edit validator details

### Cosmos SDK Distribution Types
- `MsgWithdrawDelegatorReward (rewards)` - Withdraw delegator rewards
- `MsgWithdrawValidatorCommission (rewards)` - Withdraw validator commission
- `MsgSetWithdrawAddress (rewards)` - Set withdrawal address
- `MsgFundCommunityPool (rewards)` - Fund community pool

### Cosmos SDK Governance Types
- `MsgSubmitProposal (governance)` - Submit governance proposal
- `MsgVote (governance)` - Vote on proposal
- `MsgDeposit (governance)` - Deposit tokens for proposal
- `MsgVoteWeighted (governance)` - Weighted vote on proposal

### Cosmos SDK Slashing Types
- `MsgUnjail (slashing)` - Unjail validator

### Cosmos SDK Authz Types
- `MsgGrant (authz)` - Grant authorization
- `MsgRevoke (authz)` - Revoke authorization
- `MsgExec (authz)` - Execute authorized message

### Other Types
- `unknown` - Transaction type could not be determined

## Transaction Status Filter

Transaction status values based on the transaction execution result:

- `success` - Transaction executed successfully
- `failed` - Transaction execution failed
- `pending` - Transaction is pending (rare, usually only for unconfirmed transactions)

**Note:** Most transactions in the database will be either `success` or `failed`. The `pending` status is typically only seen for transactions that haven't been confirmed yet.

## Chain Filter

Chain values are dynamic and depend on the configured RPC endpoints. Common values include:

- `mainnet` - Main Pocket Network chain
- `testnet` - Test network
- Any other chain names configured in the system

**Note:** To get the list of available chains dynamically, you can call the API endpoint that returns available chains, or check the `chain` field values in the transactions table.

## Sort By Filter

Fields available for sorting transactions:

- `timestamp` - Sort by transaction timestamp (default)
- `amount` - Sort by transaction amount
- `fee` - Sort by transaction fee
- `block_height` - Sort by block height
- `type` - Sort by transaction type
- `status` - Sort by transaction status

## Sort Order Filter

- `asc` - Ascending order
- `desc` - Descending order (default)

## Frontend Implementation Recommendations

### 1. Type Dropdown

For the transaction type dropdown, consider organizing types by category:

```javascript
const transactionTypeOptions = [
  // Application
  { value: 'MsgStakeApplication (application)', label: 'Stake Application' },
  { value: 'MsgUnstakeApplication (application)', label: 'Unstake Application' },
  { value: 'MsgDelegateToGateway (application)', label: 'Delegate to Gateway' },
  { value: 'MsgUndelegateFromGateway (application)', label: 'Undelegate from Gateway' },
  { value: 'MsgTransferApplication (application)', label: 'Transfer Application' },
  
  // Supplier
  { value: 'MsgStakeSupplier (supplier)', label: 'Stake Supplier' },
  { value: 'MsgUnstakeSupplier (supplier)', label: 'Unstake Supplier' },
  
  // Gateway
  { value: 'MsgStakeGateway (gateway)', label: 'Stake Gateway' },
  { value: 'MsgUnstakeGateway (gateway)', label: 'Unstake Gateway' },
  
  // Service
  { value: 'MsgAddService (service)', label: 'Add Service' },
  
  // Proof
  { value: 'MsgCreateClaim (proof)', label: 'Create Claim' },
  { value: 'MsgSubmitProof (proof)', label: 'Submit Proof' },
  
  // Cosmos Bank
  { value: 'MsgSend (bank)', label: 'Send Tokens' },
  { value: 'MsgMultiSend (bank)', label: 'Multi Send' },
  
  // Cosmos Staking
  { value: 'MsgDelegate (node)', label: 'Delegate' },
  { value: 'MsgUndelegate (node)', label: 'Undelegate' },
  
  // ... etc
];
```

**Alternative Approach:** You could also fetch unique transaction types dynamically from the API by calling the stats endpoint and using the `by_type` object keys.

### 2. Status Dropdown

```javascript
const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' }
];
```

### 3. Chain Dropdown

Fetch dynamically from the API or use a static list based on your deployment:

```javascript
// Fetch from API endpoint that returns available chains
// Or use static list:
const chainOptions = [
  { value: '', label: 'All Chains' },
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' }
];
```

### 4. Sort By Dropdown

```javascript
const sortByOptions = [
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'amount', label: 'Amount' },
  { value: 'fee', label: 'Fee' },
  { value: 'block_height', label: 'Block Height' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' }
];
```

### 5. Sort Order Toggle/Select

```javascript
const sortOrderOptions = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' }
];
```

## Dynamic Type Discovery

If you want to dynamically discover which transaction types actually exist in your database, you can:

1. Call the `/api/v1/transactions/stats` endpoint with your filters
2. Use the `by_type` object from the response to populate the type dropdown
3. This ensures you only show types that actually have transactions

Example:
```javascript
const stats = await fetch('/api/v1/transactions/stats?chain=mainnet');
const types = Object.keys(stats.data.by_type);
// Use these types to populate your dropdown
```

## Notes

1. **Type Format**: Transaction types include the message name and category in parentheses (e.g., `MsgStakeApplication (application)`). The frontend should use the exact value as stored in the database.

2. **Case Sensitivity**: All filter values are case-sensitive. Use exact matches as shown above.

3. **Unknown Types**: Some transactions may have type `unknown` if the classification logic couldn't determine the type. Consider including this in your dropdown or handling it separately.

4. **Parameter Updates**: Many `MsgUpdateParam` types exist for different modules. You may want to group these or show them separately as they're governance-related.

5. **Migration Types**: Migration-related types may be rare in production but should still be included for completeness.

