import { gql } from '@apollo/client'
import { PORTFOLIO_BASIC_FIELDS, HOLDING_BASIC_FIELDS } from './fragments'

// Portfolio Mutations
export const CREATE_PORTFOLIO = gql`
  mutation CreatePortfolio($input: portfolios_insert_input!) {
    insert_portfolios_one(object: $input) {
      ...PortfolioBasicFields
    }
  }
  ${PORTFOLIO_BASIC_FIELDS}
`

export const UPDATE_PORTFOLIO = gql`
  mutation UpdatePortfolio($id: uuid!, $changes: portfolios_set_input!) {
    update_portfolios_by_pk(pk_columns: { id: $id }, _set: $changes) {
      ...PortfolioBasicFields
    }
  }
  ${PORTFOLIO_BASIC_FIELDS}
`

export const DELETE_PORTFOLIO = gql`
  mutation DeletePortfolio($id: uuid!) {
    delete_portfolios_by_pk(id: $id) {
      id
    }
  }
`

// Holding Mutations
export const CREATE_HOLDING = gql`
  mutation CreateHolding($input: holdings_insert_input!) {
    insert_holdings_one(object: $input) {
      ...HoldingBasicFields
    }
  }
  ${HOLDING_BASIC_FIELDS}
`

export const UPDATE_HOLDING = gql`
  mutation UpdateHolding($id: uuid!, $changes: holdings_set_input!) {
    update_holdings_by_pk(pk_columns: { id: $id }, _set: $changes) {
      ...HoldingBasicFields
    }
  }
  ${HOLDING_BASIC_FIELDS}
`

export const DELETE_HOLDING = gql`
  mutation DeleteHolding($id: uuid!) {
    delete_holdings_by_pk(id: $id) {
      id
    }
  }
`

export const BULK_UPDATE_HOLDINGS = gql`
  mutation BulkUpdateHoldings($holdings: [holdings_insert_input!]!) {
    insert_holdings(
      objects: $holdings
      on_conflict: {
        constraint: holdings_pkey
        update_columns: [current_price, market_value, last_price_update, updated_at]
      }
    ) {
      returning {
        ...HoldingBasicFields
      }
    }
  }
  ${HOLDING_BASIC_FIELDS}
`
